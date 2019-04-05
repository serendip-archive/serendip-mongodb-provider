import { Db, MongoClientOptions, MongoClient } from "mongodb";

import * as nedb from "nedb";
import {
  DbCollectionInterface,
  DbProviderInterface,
  EntityChangeModel
} from "serendip-business-model";
import { EventEmitter } from "events";

export class MongodbProvider implements DbProviderInterface {
  changes: DbCollectionInterface<EntityChangeModel>;
  folderPath: string;

  // you can listen for  any "update","delete","insert" event. each event emitter is accessible trough property named same as collectionName
  public events: { [key: string]: EventEmitter } = {};

  public async dropDatabase() {
    return this.db.dropDatabase();
  }

  public async dropCollection(name: string) {
    return this.db.dropCollection(name);
  }

  public async collections(): Promise<string[]> {
    return (await this.db.collections()).map(p => p.collectionName);
  }

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

    if (!this.events[collectionName])
      this.events[collectionName] = new EventEmitter();
    return new MongodbCollection<T>(
      this.db.collection(collectionName),
      track,
      this
    );
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
