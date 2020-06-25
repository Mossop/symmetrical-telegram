const { promises: fs } = require("fs");
const path = require("path");

const knex = require("knex")(require("./knexfile").development);

async function parseFile(filename) {
  let content = await fs.readFile(filename, {
    encoding: "utf8",
  });

  let update = JSON.parse(content);

  await knex.transaction(async trx => {
    let patchId;
    try {
      [patchId] = await trx.into("Update").insert({
        type: update.type,
        oldVersion: update.oldVersion,
        newVersion: update.newVersion,
        platform: update.platform,
      }).returning("id");
    } catch (e) {
      console.log(update.platform, update.oldVersion, update.newVersion);
      throw e;
    }

    for (let file of update.files) {
      let fileData = {
        update: patchId,
        path: file.path,
      }

      fileData.file = path.basename(file.path);
      let extension = path.extname(file.path);
      fileData.file = file.path.substring(0, file.path.length - extension.length);
      fileData.type = extension.length ? extension.substring(1) : null;
      if (fileData.file == "XUL" || fileData.file == "libxul") {
        fileData.file = "xul";
        fileData.type = "dll";
      } else if (fileData.file.startsWith("lib")) {
        fileData.file = fileData.file.substring(3);
        if (extension != ".chk") {
          fileData.type = "dll";
        }
      } else if (extension == ".exe" || extension == "") {
        fileData.type = "executable";
      } else if (extension == "") {
        fileData.type = "executable";
      } else if (file.path.endsWith("/org.mozilla.updater")) {
        fileData.file = "updater";
        fileData.type = "executable";
      }

      if (fileData.type === null) {
        console.warn("Unknown file type", file.path);
      }

      let fileId;
      try {
        [fileId] = await trx.into("File").insert(fileData).returning("id");
      } catch (e) {
        console.log(update.platform, update.oldVersion, update.newVersion, file.path);
        throw e;
      }

      // Zucchini fails when the original file is zero size and in this case we
      // wouldn't expect any patch to be any good.
      if (file.sizes.zucchini?.size == 0) {
        delete file.sizes.zucchini;
        delete file.sizes.mbsdiff;
      }

      for (let [kind, sizes] of Object.entries(file.sizes)) {
        try {
          await trx.into("Patch").insert({
            file: fileId,
            type: kind == "original" ? "straight" : kind,
            uncompressed: sizes.size,
            xz: sizes.xzsize,
            xz86: sizes.xz86size,
          });
        } catch (e) {
          console.log(update.platform, update.oldVersion, update.newVersion, file.path, kind, sizes);
          throw e;
        }
      }
    }
  });
}

async function listFiles() {
  await knex.migrate.latest();

  try {
    let files = await fs.readdir(path.join(__dirname, "results"));
    let promises = [];
    for (let file of files) {
      promises.push(parseFile(path.join(__dirname, "results", file)));

      if (promises.length > 8) {
        await Promise.all(promises);
        promises = [];
      }
    }

    await Promise.all(promises);
  } catch (e) {
    await knex.migrate.rollback(undefined, true);
    throw e;
  }
}

listFiles().catch(e => {
  console.error(e);
}).finally(() => {
  knex.destroy();
});
