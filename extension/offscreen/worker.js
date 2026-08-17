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
   const { devicePixelRatio, width, height, left, top } = rectInfo;
   const box = {
      width: width * devicePixelRatio,
      height: height * devicePixelRatio,
      left: left * devicePixelRatio,
      top: top * devicePixelRatio,
   };
   return new Promise(async (resolve) => {
      try {
         const promises = [cropImage(imageData, box), readyWorker()];
         Promise.all(promises).then(async ([croppedImage]) => {
            const result = await worker.recognize(croppedImage);
            resolve({
               text: result.data.text,
               image: croppedImage,
            });
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

runtimeOnMessage("C_OF_FETCH_AI_TEST", (data, _, sendResponse) => {
   const { url, providerId } = data || {};
   console.log(`[OffscreenWorker] 🧪 Testing offscreen iframe fetch for: ${url} (${providerId})`);

   try {
      const iframe = document.createElement("iframe");
      iframe.style.width = "500px";
      iframe.style.height = "500px";
      iframe.style.display = "none";
      iframe.src = url;
      document.body.appendChild(iframe);

      let isFinished = false;
      const timeout = setTimeout(() => {
         if (!isFinished) {
            isFinished = true;
            iframe.remove();
            sendResponse({
               success: false,
               reason: "Offscreen iframe load timed out (Blocked by site CSP/X-Frame-Options or Anti-Bot)",
            });
         }
      }, 5000);

      iframe.onload = () => {
         if (!isFinished) {
            isFinished = true;
            clearTimeout(timeout);
            try {
               const doc = iframe.contentDocument || iframe.contentWindow?.document;
               const text = (doc?.body?.innerText || "").trim();
               iframe.remove();
               sendResponse({
                  success: true,
                  textLength: text.length,
                  preview: text.slice(0, 120),
               });
            } catch (crossOriginErr) {
               iframe.remove();
               sendResponse({
                  success: false,
                  reason: "Blocked by Cross-Origin Isolation: Cannot access iframe DOM from extension origin",
                  error: crossOriginErr.message,
               });
            }
         }
      };

      iframe.onerror = (err) => {
         if (!isFinished) {
            isFinished = true;
            clearTimeout(timeout);
            iframe.remove();
            sendResponse({
               success: false,
               reason: "Iframe failed to load due to X-Frame-Options DENY",
               error: String(err),
            });
         }
      };
   } catch (e) {
      sendResponse({ success: false, reason: e.message });
   }
   return true;
});
