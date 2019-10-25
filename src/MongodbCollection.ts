import {
  Collection,
  ObjectID,
  IndexOptions,
  GridFSBucket,
} from "mongodb";
import {
  EntityChangeType,
  DbCollectionInterface,
  CollectionAggregationOptions
} from "serendip-business-model";
import { applyOperation, compare } from "fast-json-patch";

import { MongodbProvider } from "./MongodbProvider";
import { EventEmitter } from "events";
export class MongodbCollection<T> implements DbCollectionInterface<T> {
  constructor(
    private collection: Collection,
    private track: boolean,
    private provider: MongodbProvider
  ) {
    if (!provider.events) provider.events = {};

    if (!provider.events[collection.collectionName])
      provider.events[collection.collectionName] = new EventEmitter();
  }

  public async ensureIndex(fieldOrSpec: any, options: IndexOptions) {
    await this.collection.createIndex(fieldOrSpec, options);
  }

  public aggregate(pipeline: any[], options: CollectionAggregationOptions) {
    return this.collection.aggregate(pipeline, options as any).toArray();
  }
  public find(query?, skip?: any, limit?: any): Promise<T[]> {
    if (query && query._id) query._id = new ObjectID(query._id);

    if (skip) skip = parseInt(skip);
    if (limit) limit = parseInt(limit);
    return new Promise((resolve, reject) => {
      if (skip >= 0 && limit > 0)
        this.collection
          .find<T>(query)
          .skip(skip)
          .limit(limit)
          .toArray((err, results) => {
            if (err) return reject(err);
            return resolve(
              results.map((p: any) => {
                p._id = p._id.toString();
                return p;
              })
            );
          });
      else
        this.collection.find<T>(query).toArray((err, results) => {
          if (err) return reject(err);
          return resolve(
            results.map((p: any) => {
              p._id = p._id.toString();
              return p;
            })
          );
        });
    });
  }
  public count(query?): Promise<Number> {
    if (query && query._id) {
      query._id = new ObjectID(query._id);
    }
    return this.collection.find(query).count();
  }
  public updateOne(
    model: T,
    userId?: string,
    trackOptions?: { metaOnly?: boolean }
  ): Promise<T> {
    if (!trackOptions) trackOptions = {};

    return new Promise((resolve, reject) => {
      model["_id"] = new ObjectID(model["_id"]);
      model["_vdate"] = Date.now();

      this.collection.findOneAndUpdate(
        { _id: model["_id"] },
        { $set: model },
        {
          upsert: true,
          returnOriginal: false
        },
        (err, result) => {
          if (err) return reject(err);

          if (this.track) {
            const trackRecord = {
              date: Date.now(),
              model: null,
              diff: null,
              type: EntityChangeType.Update,
              userId: userId,
              collection: this.collection.collectionName,
              entityId: model["_id"]
            };

            if (!trackOptions.metaOnly) {
              trackRecord.model = model;
              trackRecord.diff = compare(result.value, model);
            }
            this.provider.changes.insertOne(trackRecord);
          }

          this.provider.events[this.collection.collectionName].emit(
            "update",
            result.value
          );

          resolve(result.value);
        }
      );
    });
  }
  public deleteOne(
    _id: string | ObjectID,
    userId?: string,
    trackOptions?: { metaOnly: boolean }
  ): Promise<T> {
    return new Promise(async (resolve, reject) => {
      var model: any;
      var modelQuery = await this.find({ _id: new ObjectID(_id) });
      if (modelQuery && modelQuery[0]) model = modelQuery[0];
      else return reject("not found");
      this.collection
        .deleteOne({ _id: new ObjectID(_id) })
        .then(async () => {
          if (this.track) {
            let trackRecord = {
              date: Date.now(),
              diff: null,
              type: EntityChangeType.Delete,
              userId: userId,
              collection: this.collection.collectionName,
              entityId: _id,
              model: null
            };

            if (trackOptions && trackOptions.metaOnly)
              trackRecord.model = model;

            await this.provider.changes.insertOne(trackRecord);
          }

          this.provider.events[this.collection.collectionName].emit(
            "delete",
            model
          );

          resolve(model);
        })
        .catch(err => {
          console.error(
            `error in deleting ${_id} from ${this.collection.collectionName}`
          );
          reject(err);
        });
    });
  }
  public insertOne(
    model: T | any,
    userId?: string,
    trackOptions?: { metaOnly?: boolean }
  ): Promise<T> {
    model["_vdate"] = Date.now();

    if (!trackOptions) trackOptions = {};
    return new Promise((resolve, reject) => {
      var objectId: ObjectID = new ObjectID();
      if (model._id && typeof model._id == "string")
        model._id = new ObjectID(model._id);
      if (!model._id) model._id = new ObjectID();
      var doc = this.collection.insertOne(model, async (err, result) => {
        if (err) return reject(err);
        if (this.track) {
          let trackRecord = {
            date: Date.now(),
            model: null,
            diff: null,
            type: EntityChangeType.Create,
            userId: userId,
            collection: this.collection.collectionName,
            entityId: model._id
          };

          if (!trackOptions.metaOnly) {
            trackRecord.model = model;
            trackRecord.diff = compare({}, model);
          }
          await this.provider.changes.insertOne(trackRecord);
        }
        this.provider.events[this.collection.collectionName].emit(
          "insert",
          model
        );

        resolve(model);
      });
    });
  }
}
