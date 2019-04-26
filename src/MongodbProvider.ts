import { Db, MongoClientOptions, MongoClient, GridFSBucket, ObjectID } from "mongodb";

import { MongodbCollection } from "./MongodbCollection";
import {
  DbCollectionInterface,
  DbProviderInterface,
  EntityChangeModel
} from "serendip-business-model";
import { EventEmitter } from "events";
import * as fs from 'fs';
import { Writable, Readable } from "stream";

export class MongodbProvider implements DbProviderInterface {
  changes: DbCollectionInterface<EntityChangeModel>;

  /**
   * Instance of mongodb database
   */
  public db: Db;

  // you can listen for  any "update","delete","insert" event. each event emitter is accessible trough property named same as collectionName
  public events: { [key: string]: EventEmitter } = {};

  bucket: GridFSBucket;
  files: DbCollectionInterface<any>;
  fileChunks: DbCollectionInterface<any>;

  public async dropDatabase() {
    return this.db.dropDatabase();
  }

  public async dropCollection(name: string) {
    return this.db.dropCollection(name);
  }

  public async collections(): Promise<string[]> {
    return (await this.db.collections()).map(p => p.collectionName);
  }

  public async openUploadStreamByFilePath(filePath: string, metadata: any): Promise<Writable> {

    for (const file of await this.files.find({
      filename: filePath
    })) {

      await this.files.deleteOne(file._id);
      for (const chunk of await this.fileChunks.find({ files_id: new ObjectID(file._id) })) {
        await this.fileChunks.deleteOne(chunk._id);
      }
    }

    return this.bucket.openUploadStream(filePath, {
      metadata
    }) as Writable;

  }


  public async openDownloadStreamByFilePath(filePath: string, opts?: { start?: number, end?: number, revision?: number }): Promise<Readable> {

    if (!opts)
      opts = {};

    return this.bucket.openDownloadStreamByName(filePath, {
      revision: opts.revision,
      start: opts.start,
      end: opts.end
    }) as Readable;

  }



  public async stats(): Promise<{
    db: string;
    collections: number;
    indexes: number;
    avgObjSizeByte: number;
    objects: number;
    storageMB: number;
    fsUsedMB: number;
    fsTotalMB: number;
  }> {
    const stat = await this.db.stats({ scale: 1024 * 1024 });
    return {
      db: stat.db,
      collections: stat.collections,
      indexes: stat.indexes,
      avgObjSizeByte: stat.avgObjSize,
      objects: stat.objects,
      fsUsedMB: stat.fsUsedSize,
      fsTotalMB: stat.fsTotalSize,
      storageMB: stat.storageSize
    };
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

    if (!this.events[collectionName])
      this.events[collectionName] = new EventEmitter();
    return new MongodbCollection<T>(
      this.db.collection(collectionName),
      track,
      this
    );
  }
  async initiate(options: any): Promise<void> {
    try {
      // Creating mongoDB client from mongoUrl

      let connectOptions: MongoClientOptions = {
        useNewUrlParser: true
      };

      if (options.authSource) {
        connectOptions.authSource = options.authSource;
      }

      if (options.user && options.password) {
        connectOptions.auth = {
          user: options.user,
          password: options.password
        };
      }

      var mongoClient = await MongoClient.connect(
        options.mongoUrl,
        connectOptions
      );

      this.db = mongoClient.db(options.mongoDb);


      this.bucket = new GridFSBucket(this.db);


      this.changes = await this.collection<EntityChangeModel>(
        "EntityChanges",
        false
      );

      this.files = await this.collection<any>('fs.files');
      this.fileChunks = await this.collection<any>('fs.chunks');


    } catch (error) {
      throw new Error(
        "\n\nUnable to connect to MongoDb. Error details: \n" + error.message
      );
    }
  }
}
