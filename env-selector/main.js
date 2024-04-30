const config = require("./utils/configs");
const { exec } = require("child_process");

let version = 0;

const KEY_ENV_FILE = {
    test: "test",
    yupeng: "yupeng",
    xiaojun: "xiaojun",
    zhiyuan: "zhiyuan",
    wx: "wx",
};

module.exports = {
    load(context) {
        Editor.log("activate", context);
    },
    unload() {
        Editor.log("deactivate");
    },
    loadEnvConfig() {
        return config.loadEnv(".env.config");
    },
    messages: {
        ChooseTestServer() {
            this.changeConfigFile(KEY_ENV_FILE.test);
        },
        ChooseYuPengServer() {
            this.changeConfigFile(KEY_ENV_FILE.yupeng);
        },
        ChooseXiaoJunServer() {
            this.changeConfigFile(KEY_ENV_FILE.xiaojun);
        },
        ChooseZhiYuanServer() {
            this.changeConfigFile(KEY_ENV_FILE.zhiyuan);
        },
        ChooseWXServer() {
            this.changeConfigFile(KEY_ENV_FILE.wx);
        },
        "scene:ready"(target) {
            this.target = target;
            // Editor.log("scene:ready", target);
        },
        "scene:reloading"(target) {
            this.target = target;
            // Editor.log("scene:reloading", target);
        },
        "editor:build-start"(target) {
            Editor.log("editor:build-start", target);
        },
        "editor:build-finished"(target) {
            Editor.log("editor:build-finished", target);
        },
    },

    changeConfigFile(key) {
        const envConfig = this.loadEnvConfig();
        let fileKey = envConfig ? envConfig[key] : key;
        const content = config.loadEnv(fileKey);
        config.changeDebugConfig(fileKey, content, ++version);
        this.forceRefresh(fileKey);
    },

    // resetConfigFile(content) {
    //     const configFilePath = path.join(config.projectPath(), configFilePath);
    //     if (!fs.existsSync(configFilePath)) {
    //         return;
    //     }
    // },

    forceRefresh(envKey) {
        try {
            Editor.assetdb.refresh(`db:/${config.filePath}`, function (err, results) {
                if (err) {
                    Editor.error("Error refreshing asset:", err);
                } else {
                    Editor.log("Assets refreshed successfully");
                    Editor.Ipc.sendToPanel("scene", "scene:stash-and-save");
                    Editor.log(`game updated, current env: `, envKey);
                }
            });
        } catch (error) {
            Editor.error("error", error);
        }
    },
};
