const data = require("./all_results.json");

console.log("Platform,Patch Type,Filename,Filetype,Current Size,Zucchini Size,Best Size,Best Strategy")
const results = {};
for (let { platform, type, files, oldVersion, newVersion } of data) {
  if (!(platform in results)) {
    results[platform] = {};
  }

  if (!(type in results[platform])) {
    results[platform][type] = [];
  }

  for (let file of files) {
    let output = [
      platform,
      type,
      file.path,
      file.type,
    ]

    if ("mbsdiff" in file.sizes) {
      output.push(Math.min(file.sizes.mbsdiff.xz86size, file.sizes.original.xz86size))
    } else {
      output.push(file.sizes.original.xz86size)
    }

    if ("zucchini" in file.sizes) {
      output.push(Math.min(file.sizes.zucchini.xz86size, file.sizes.original.xz86size))
    } else {
      output.push(file.sizes.original.xz86size)
    }

    let best_patch = "original";
    let best_compression = "size";
    for (let patch of Object.keys(file.sizes)) {
      for (let [compression, size] of Object.entries(file.sizes[patch])) {
        if (file.sizes[best_patch][best_compression] > size) {
          best_patch = patch;
          best_compression = compression;
        }
      }
    }
    output.push(file.sizes[best_patch][best_compression]);

    if (best_compression == "size") {
      best_compression = "none";
    }
    output.push(`${best_patch}-${best_compression}`);

    console.log(output.join(","));
  }
}
