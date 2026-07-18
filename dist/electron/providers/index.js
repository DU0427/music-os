"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProviderRegistry = void 0;
exports.createProviderRegistry = createProviderRegistry;
const mock_1 = require("./mock");
const registry_1 = require("./registry");
function createProviderRegistry() {
    const registry = new registry_1.ProviderRegistry();
    registry.register(new mock_1.MockMusicProvider());
    return registry;
}
var registry_2 = require("./registry");
Object.defineProperty(exports, "ProviderRegistry", { enumerable: true, get: function () { return registry_2.ProviderRegistry; } });
