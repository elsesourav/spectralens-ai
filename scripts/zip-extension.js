import archiver from "archiver";
import { createWriteStream, existsSync, unlinkSync } from "fs";
import path from "path";
import { createRequire } from "module";

const require = createRequire(import.meta.url);

async function zipExtension() {
   const extensionDir = "./extension";
   const outputPath = "./spectralens-ai-extension.zip";

   // Check if extension directory exists
   if (!existsSync(extensionDir)) {
      console.error(
         '❌ Extension directory not found. Run "npm run build" first.'
      );
      process.exit(1);
   }

   console.log("📦 Creating extension zip file...");

   // Create a file to stream archive data to
   const output = createWriteStream(outputPath);
   const archive = archiver("zip", {
      zlib: { level: 9 }, // Sets the compression level
   });

   // Listen for all archive data to be written
   output.on("close", function () {
      const sizeInMB = (archive.pointer() / 1024 / 1024).toFixed(2);
      console.log(`✅ Extension zipped successfully!`);
      console.log(`📁 File: ${outputPath}`);
      console.log(`📊 Size: ${sizeInMB} MB (${archive.pointer()} bytes)`);
      console.log(`🚀 Ready to upload to Chrome Web Store!`);

      // Update README.md with the latest size and date
      try {
         const fs = require("fs");
         const readmePath = "./README.md";
         if (fs.existsSync(readmePath)) {
            let readmeContent = fs.readFileSync(readmePath, "utf8");
            
            const dateStr = new Date().toISOString().split("T")[0];
            const downloadLinkRegex = /\*\*\[⬇️ Download Here\]\([^)]+\)\*\*.*$/m;
            
            if (downloadLinkRegex.test(readmeContent)) {
               readmeContent = readmeContent.replace(
                  downloadLinkRegex,
                  `**[⬇️ Download Here](https://github.com/elsesourav/spectralens-ai/raw/main/spectralens-ai-extension.zip)** *(Size: ${sizeInMB} MB, Updated: ${dateStr})*`
               );
               fs.writeFileSync(readmePath, readmeContent, "utf8");
               console.log("📝 README.md updated with latest download info.");
            }
         }
      } catch (err) {
         console.error("❌ Failed to update README.md:", err.message);
      }
   });

   // Handle warnings
   archive.on("warning", function (err) {
      if (err.code === "ENOENT") {
         console.warn("⚠️ Warning:", err.message);
      } else {
         throw err;
      }
   });

   // Handle errors
   archive.on("error", function (err) {
      console.error("❌ Error creating zip:", err.message);
      throw err;
   });

   // Pipe archive data to the file
   archive.pipe(output);

   // Remove build scripts from the extension folder if they were copied there
   const buildScripts = ["zip-extension.js", "update-version.js"];
   buildScripts.forEach((script) => {
      const scriptPath = path.join(extensionDir, script);
      if (existsSync(scriptPath)) {
         unlinkSync(scriptPath);
      }
   });

   // Add extension files while ignoring .DS_Store and development artifacts
   archive.glob("**/*", {
      cwd: extensionDir,
      ignore: ["**/.DS_Store", "**/zip-extension.js", "**/test-extension.js", "**/update-version.js"],
   });

   // Create a simple text readme for the zip
   const simpleReadme = `SpectraLens AI Chrome Extension
===========================

About
-----
A powerful Chrome extension that brings multiple AI assistants together in one convenient interface. Get answers from Google Gemini, Bing AI, Perplexity, Grok, and more - all at once!

How to Use (Video Tutorial)
---------------------------
Watch the video guide here: https://youtu.be/KsRN0qGqnlY

Setup Instructions
------------------
1. Extract this zip file to any folder on your computer.
2. Open your browser (Chrome/Edge/Opera) and go to the extensions page (e.g., chrome://extensions/).
3. Turn on "Developer Mode" in the top right corner.
4. Click "Load unpacked" and select the folder you just extracted.
5. You're done! The extension icon will appear in your browser toolbar.
`;
   archive.append(simpleReadme, { name: "readme.txt" });

   if (existsSync("./MIT-LICENSE.txt")) {
      archive.file("./MIT-LICENSE.txt", { name: "MIT-LICENSE.txt" });
   }

   // Finalize the archive
   await archive.finalize();
}

// Run the zip function
zipExtension().catch(console.error);
