"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const assert = require("assert");
const fs = require("fs-extra");
const dotenv = require("dotenv");
const MongodbProvider_1 = require("../MongodbProvider");
dotenv.config();
describe("gridfs scenarios", () => {
    let provider;
    let collection;
    beforeEach(done => {
        (() => __awaiter(this, void 0, void 0, function* () {
            // runs before each test in this block
            provider = new MongodbProvider_1.MongodbProvider();
            yield provider.initiate({
                mongoDb: process.env["db.mongoDb"],
                mongoUrl: process.env["db.mongoUrl"],
                authSource: process.env["db.authSource"],
                user: process.env["db.user"],
                password: process.env["db.password"]
            });
            try {
                yield provider.dropCollection("fs.files");
                yield provider.dropCollection("fs.chunks");
            }
            catch (error) { }
            collection = yield provider.collection("fs.files");
            done();
        }))();
    });
    it("should upload", done => {
        (() => __awaiter(this, void 0, void 0, function* () {
            const uploadStream = yield provider.openUploadStreamByFilePath('package.json', {});
            fs.createReadStream('package.json').pipe(uploadStream);
            return new Promise((resolve, reject) => {
                uploadStream.on('finish', () => __awaiter(this, void 0, void 0, function* () {
                    const downloadStream = yield provider.openDownloadStreamByFilePath('package.json');
                    let data = '';
                    downloadStream.on('data', (chunk) => {
                        data += chunk;
                    });
                    downloadStream.on('end', () => {
                        assert.equal(fs.readFileSync('package.json').toString(), data);
                        resolve();
                    });
                }));
            });
        }))()
            .then(done)
            .catch(done);
    }).timeout(1000);
    it("upload should overwrite on same path with different streams", done => {
        (() => __awaiter(this, void 0, void 0, function* () {
            for (let i = 0; i < 3; i++) {
                yield new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
                    const uploadStream = yield provider.openUploadStreamByFilePath('test', {});
                    uploadStream.write(i.toString());
                    uploadStream.end();
                    uploadStream.on('finish', resolve);
                }));
            }
            return new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
                const downloadStream = yield provider.openDownloadStreamByFilePath('test');
                let data = '';
                downloadStream.on('data', (chunk) => {
                    data += chunk;
                });
                downloadStream.on('end', () => {
                    assert.equal('2', data);
                    resolve();
                });
            }));
        }))()
            .then(done)
            .catch(done);
    }).timeout(1000);
    it("should overwrite file record on same filePath upload", done => {
        (() => __awaiter(this, void 0, void 0, function* () {
            const uploadStream1 = yield provider.openUploadStreamByFilePath('package.json', {});
            fs.createReadStream('package.json').pipe(uploadStream1);
            return new Promise((resolve, reject) => {
                uploadStream1.on('finish', () => __awaiter(this, void 0, void 0, function* () {
                    const uploadStream2 = yield provider.openUploadStreamByFilePath('package.json', {});
                    fs.createReadStream('package.json').pipe(uploadStream2);
                    uploadStream2.on('finish', () => {
                        collection.count({ filename: 'package.json' }).then((count) => {
                            assert.equal(count, 1);
                            resolve();
                        }).catch(reject);
                    });
                }));
            });
        }))()
            .then(done)
            .catch(done);
    }).timeout(1000);
});
