import { NedbCollection } from "./NedbCollection";

import * as nedb from "nedb";
import {
  DbCollectionInterface,
  DbProviderInterface,
  EntityChangeModel
} from "serendip-business-model";
import { join } from "path";
export class NedbProvider implements DbProviderInterface {
  changes: DbCollectionInterface<EntityChangeModel>;
  folderPath: string;

  public async collection<T>(
    collectionName: string,
    track?: boolean
  ): Promise<DbCollectionInterface<T>> {
    collectionName = collectionName.trim();

    // if (this.db.collection.indexOf(collectionName) === -1) {
    //   await this.db.createCollection(collectionName);
    //   this.mongoCollections.push(collectionName);

    //   if (Server.opts.logging == "info")
    //     console.log(`☑ collection ${collectionName} created .`);
    // }
    let db: nedb;

    if (this.folderPath)
      db = new nedb({
        filename: join(this.folderPath, `${collectionName}.nedb`),
        autoload: true
      });
    else db = new nedb();

    (db as any).collectionName = collectionName;
    return new NedbCollection<T>(db, track, this);
  }
  async initiate(options: { folderPath: string }): Promise<void> {
    this.folderPath = options.folderPath;
    try {
      // Creating mongoDB client from mongoUrl

      this.changes = await this.collection<EntityChangeModel>(
        "EntityChanges",
        false
      );
    } catch (error) {
      throw new Error(
        "\n\nUnable to connect to MongoDb. Error details: \n" + error.message
      );
    }
  }
}
