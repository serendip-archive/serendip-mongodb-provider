import * as nedb from "nedb";
import * as _ from "underscore";
import ObjectID from "bson-objectid";
import {
  EntityChangeType,
  DbCollectionInterface
} from "serendip-business-model";
import * as deep from "deep-diff";

import { NedbProvider } from "./NedbProvider";
export class NedbCollection<T> implements DbCollectionInterface<T> {
  collectionName: any;
  constructor(
    private collection: nedb,
    private track: boolean,
    private provider: NedbProvider
  ) {
    this.collectionName = (this.collection as any).collectionName;
  }
  public async ensureIndex(fieldOrSpec: any, options: nedb.EnsureIndexOptions) {
    await this.collection.ensureIndex(
      _.extend(options, {
        fieldName: fieldOrSpec
      })
    );
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
          .exec((err, results) => {
            if (err) return reject(err);
            return resolve(
              results.map((p: any) => {
                p._id = p._id.toString();
                return p;
              })
            );
          });
      else
        this.collection.find<T>(query).exec((err, results) => {
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
    return new Promise((resolve, reject) => {
      if (query && query._id) {
        query._id = new ObjectID(query._id);
      }
      this.collection.count(query, (err, count) => {
        if (err) return reject(err);

        resolve(count);
      });
    });
  }
  public updateOne(model: T, userId?: string): Promise<T> {
    return new Promise((resolve, reject) => {
      model["_id"] = new ObjectID(model["_id"]);
      model["_vdate"] = Date.now();
      this.collection.update(
        { _id: model["_id"] },
        { $set: model },
        {
          upsert: true,
          returnUpdatedDocs: true
        },
        (err, number, docs) => {
          if (err) return reject(err);
          if (!docs || !docs[0]) return reject(new Error("noting updated"));
          resolve(docs[0]);
          if (this.track)
            this.provider.changes.insertOne({
              date: Date.now(),
              model,
              diff: deep.diff(docs[0], model),
              type: EntityChangeType.Update,
              userId: userId,
              collection: this.collectionName,
              entityId: model["_id"]
            });
        }
      );
    });
  }
  public deleteOne(_id: string, userId?: string): Promise<T> {
    return new Promise(async (resolve, reject) => {
      var model: any;
      var modelQuery = await this.find({ _id: new ObjectID(_id) });
      if (modelQuery && modelQuery[0]) model = modelQuery[0];
      else return reject("not found");
      this.collection.remove({ _id: new ObjectID(_id) }, err => {
        if (err) return reject(err);

        if (this.track) {
          this.collection.insert(
            {
              date: Date.now(),
              diff: null,
              type: EntityChangeType.Delete,
              userId: userId,
              collection: this.collectionName,
              entityId: _id,
              model: model
            },
            trackInsertErr => {
              if (trackInsertErr)
                console.error(
                  `error in inserting change record when deleting ${_id} from ${
                    this.collectionName
                  }`,
                  trackInsertErr
                );

              resolve(model);
            }
          );
        }
      });
    });
  }
  public insertOne(model: T | any, userId?: string): Promise<T> {
    model["_vdate"] = Date.now();
    return new Promise((resolve, reject) => {
      var objectId: ObjectID = new ObjectID();
      if (model._id && typeof model._id == "string")
        model._id = new ObjectID(model._id);
      if (!model._id) model._id = new ObjectID();
      var doc = this.collection.insert(model, (err, result) => {
        if (err) return reject(err);
        if (this.track)
          this.provider.changes.insertOne({
            date: Date.now(),
            model: model,
            diff: deep.diff({}, model),
            type: EntityChangeType.Create,
            userId: userId,
            collection: this.collectionName,
            entityId: model._id
          });
        resolve(model);
      });
    });
  }
}
