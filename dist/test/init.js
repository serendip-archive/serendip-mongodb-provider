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
const dotenv = require("dotenv");
const MongodbProvider_1 = require("../MongodbProvider");
dotenv.config();
describe("init scenarios", () => {
    let provider;
    let collection;
    it("should do simple initiate", done => {
        (() => __awaiter(this, void 0, void 0, function* () {
            const provider = new MongodbProvider_1.MongodbProvider();
            yield provider.initiate({
                mongoDb: process.env["db.mongoDb"],
                mongoUrl: process.env["db.mongoUrl"],
                authSource: process.env["db.authSource"],
                user: process.env["db.user"],
                password: process.env["db.password"]
            });
        }))()
            .then(done)
            .catch(done);
    });
    it("should get stats", done => {
        (() => __awaiter(this, void 0, void 0, function* () {
            const provider = new MongodbProvider_1.MongodbProvider();
            yield provider.initiate({
                mongoDb: process.env["db.mongoDb"],
                mongoUrl: process.env["db.mongoUrl"],
                authSource: process.env["db.authSource"],
                user: process.env["db.user"],
                password: process.env["db.password"]
            });
            console.log('\t db stats: ', yield provider.stats());
        }))()
            .then(done)
            .catch(done);
    });
});
