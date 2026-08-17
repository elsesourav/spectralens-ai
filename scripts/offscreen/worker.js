/* eslint-disable no-async-promise-executor */
/* eslint-disable no-undef */
let worker;

function cropImage(imageData, { width, height, left, top }, mode = "normal") {
   return new Promise((resolve) => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      const img = new Image();

      img.onload = () => {
         canvas.width = width || img.width;
         canvas.height = height || img.height;
         if (width && height) {
            ctx.drawImage(img, left, top, width, height, 0, 0, width, height);
         } else {
            ctx.drawImage(img, 0, 0);
         }
         if (mode === "invert" || mode === "gray") {
            ctx.globalCompositeOperation =
               mode === "gray" ? "saturation" : "difference";
            ctx.fillStyle = "#fff";
            ctx.globalAlpha = 1;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
         }

         resolve(canvas.toDataURL());
      };
      img.src = imageData;
   });
}

function readyWorker() {
   return new Promise(async (resolve) => {
      if (!worker) {
         try {
            const workerPath =
               typeof chrome !== "undefined" && chrome.runtime?.getURL
                  ? chrome.runtime.getURL("offscreen/OCR/worker.min.js")
                  : "OCR/worker.min.js";
            const corePath =
               typeof chrome !== "undefined" && chrome.runtime?.getURL
                  ? chrome.runtime.getURL("offscreen/OCR/Tesseract")
                  : "OCR/Tesseract";
            const langPath =
               typeof chrome !== "undefined" && chrome.runtime?.getURL
                  ? chrome.runtime.getURL("offscreen/OCR/Lang/")
                  : "OCR/Lang/";

            worker = await Tesseract.createWorker("eng", 1, {
               workerBlobURL: false,
               workerPath,
               corePath,
               langPath,
               logger: updateProgress,
            });
         } catch (error) {
            console.error("Error creating Tesseract worker:", error);
         } finally {
            resolve();
         }
      } else {
         resolve();
      }
   });
}

function updateProgress() {
   return;
}

function processOCR(imageData, rectInfo) {
   let box = null;
   if (rectInfo && typeof rectInfo === "object" && rectInfo.width && rectInfo.height) {
      const dpr = rectInfo.devicePixelRatio || 1;
      box = {
         width: (rectInfo.width || 0) * dpr,
         height: (rectInfo.height || 0) * dpr,
         left: (rectInfo.left || 0) * dpr,
         top: (rectInfo.top || 0) * dpr,
      };
   }

   return new Promise(async (resolve) => {
      try {
         const imageToProcess = box ? await cropImage(imageData, box) : imageData;
         await readyWorker();
         if (!worker) {
            console.error("Tesseract worker not initialized");
            resolve(null);
            return;
         }
         const result = await worker.recognize(imageToProcess);
         resolve({
            text: result?.data?.text || "",
            image: imageToProcess,
         });
      } catch (error) {
         console.error("Error processing OCR:", error);
         resolve(null);
      }
   });
}

window.addEventListener("beforeunload", async () => {
   if (worker) {
      await worker.terminate();
   }
});

runtimeOnMessage("C_OF_START_QRC", (data, _, sendResponse) => {
   const { imageData, rectInfo } = data || {};
   processOCR(imageData, rectInfo)
      .then((result) => {
         sendResponse({ success: !!result, result });
      })
      .catch((err) => {
         console.error("OCR failed with error:", err);
         sendResponse({ success: false, error: String(err) });
      });
   return true;
});

