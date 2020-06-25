exports.up = function (knex) {
  return knex.schema
    .createTable("Update", table => {
      table.increments('id');
      table.string('type', 20).notNullable();
      table.string('oldVersion', 20).notNullable();
      table.string('newVersion', 20).notNullable();
      table.string('platform', 20).notNullable();
      table.unique(["oldVersion", "newVersion", "platform"]);
    }).createTable("File", table => {
      table.increments('id');
      table.integer('update').notNullable();
      table.foreign('update').references('Update.id');
      table.string('path', 200).notNullable();
      table.string("file", 100).notNullable();
      table.string('type', 30).notNullable();
      table.unique(["update", "path"]);
    })
    .createTable("Patch", table => {
      table.increments('id');
      table.integer('file').notNullable();
      table.foreign('file').references('File.id');
      table.string("type").notNullable();
      table.integer('uncompressed').notNullable();
      table.integer('xz').notNullable();
      table.integer('xz86').notNullable();
      table.unique(["file", "type"]);
    });
};

exports.down = function (knex) {
  return knex.schema
    .dropTable("Patch")
    .dropTable("File")
    .dropTable("Update");
};
