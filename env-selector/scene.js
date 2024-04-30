const configs = require("./utils/configs");

module.exports = {
    "update-game-config": function (event) {
        const config = configs.loadEnv("test");
        if (event.reply) {
            event.reply(null, config);
        }
    },
};
