"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Location = void 0;
const tslib_1 = require("tslib");
const typeorm_1 = require("typeorm");
const User_1 = require("./User");
const Batch_1 = require("./Batch");
const Note_1 = require("./Note");
let Location = class Location {
    id;
    denomination;
    description;
    phone;
    parent_id;
    sort_order;
    parent;
    children;
    users;
    batches;
    notes;
};
exports.Location = Location;
tslib_1.__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    tslib_1.__metadata("design:type", Number)
], Location.prototype, "id", void 0);
tslib_1.__decorate([
    (0, typeorm_1.Column)(),
    tslib_1.__metadata("design:type", String)
], Location.prototype, "denomination", void 0);
tslib_1.__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    tslib_1.__metadata("design:type", String)
], Location.prototype, "description", void 0);
tslib_1.__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    tslib_1.__metadata("design:type", String)
], Location.prototype, "phone", void 0);
tslib_1.__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    tslib_1.__metadata("design:type", Number)
], Location.prototype, "parent_id", void 0);
tslib_1.__decorate([
    (0, typeorm_1.Column)({ type: 'integer', default: 0 }),
    tslib_1.__metadata("design:type", Number)
], Location.prototype, "sort_order", void 0);
tslib_1.__decorate([
    (0, typeorm_1.ManyToOne)(() => Location, (location) => location.children),
    (0, typeorm_1.JoinColumn)({ name: 'parent_id' }),
    tslib_1.__metadata("design:type", Location)
], Location.prototype, "parent", void 0);
tslib_1.__decorate([
    (0, typeorm_1.OneToMany)(() => Location, (location) => location.parent),
    tslib_1.__metadata("design:type", Array)
], Location.prototype, "children", void 0);
tslib_1.__decorate([
    (0, typeorm_1.OneToMany)(() => User_1.User, (user) => user.location),
    tslib_1.__metadata("design:type", Array)
], Location.prototype, "users", void 0);
tslib_1.__decorate([
    (0, typeorm_1.OneToMany)(() => Batch_1.Batch, (batch) => batch.location),
    tslib_1.__metadata("design:type", Array)
], Location.prototype, "batches", void 0);
tslib_1.__decorate([
    (0, typeorm_1.OneToMany)(() => Note_1.Note, (note) => note.location),
    tslib_1.__metadata("design:type", Array)
], Location.prototype, "notes", void 0);
exports.Location = Location = tslib_1.__decorate([
    (0, typeorm_1.Entity)()
], Location);
