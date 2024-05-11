const config = require("./utils/configs");

let version = 0;
let currentEnv = "";

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
            try {
                if (currentEnv !== KEY_ENV_FILE.wx) {
                    Editor.error("当前环境不是微信环境，请切换到微信环境再进行构建");
                }
                config.setWxConfigState(true);
            } catch (e) {
                Editor.error("start", e);
            }
        },
        "editor:build-finished"(target) {
            try {
                config.setWxConfigState(false);
            } catch (e) {
                Editor.error("end", e);
            }
        },
    },

    changeConfigFile(key) {
        const envConfig = this.loadEnvConfig();
        let fileKey = envConfig ? envConfig[key] : key;
        let content = config.loadEnv(fileKey);
        if (!content) {
            content = this.defaultEnvConfig(fileKey);
        }
        config.changeDebugConfig(fileKey, content, ++version);
        this.forceRefresh(fileKey);

        currentEnv = key;
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
                    Editor.log(`game updated, current server: `, envKey);
                }
            });
        } catch (error) {
            Editor.error("error", error);
        }
    },

    defaultEnvConfig(key) {
        let content = null;
        switch (key) {
            case KEY_ENV_FILE.test:
                content = {
                    loginServiceUrl: "https://wx-test-login.h5world.com:20012",
                };
                break;
            case KEY_ENV_FILE.yupeng:
                content = {
                    loginServiceUrl: `loginServiceUrl=http://192.168.1.5:20012`,
                };
                break;
            case KEY_ENV_FILE.xiaojun:
                content = {
                    loginServiceUrl: `loginServiceUrl=http://192.168.1.139:20012`,
                };
                break;
            case KEY_ENV_FILE.zhiyuan:
                content = {
                    loginServiceUrl: `loginServiceUrl=http://192.168.1.182:20012`,
                };
                break;
            case KEY_ENV_FILE.wx:
                content = {
                    needSDKUid: true,
                    isSubpackage: true,
                };
                break;
            default:
                break;
        }
        return content;
    },
};
