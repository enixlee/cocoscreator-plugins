const fs = require("fs");
const path = require("path");

const projectPath = () => {
    return Editor.Project.path;
};

const filePath = `/assets/scripts/Game/config/`;
const fileName = `AftGameConfigDebug`;

const wxConfigFileName = `GameConfig`;

const loadEnv = (suffix) => {
    const filePath = path.join(projectPath(), `.env.${suffix}`);
    if (!fs.existsSync(filePath)) {
        return null;
    }

    const env = fs.readFileSync(filePath, "utf-8");

    const envObj = {};
    env.split("\n").forEach((line) => {
        const [key, value] = line.split("=");
        if (key && value) {
            let v = value.replace("\r", "");
            if (v.indexOf('"') === 0) {
                v = v.replace(/"/g, "");
            } else {
                const intValue = parseInt(v);
                if (!isNaN(intValue)) {
                    envObj[key] = parseInt(v);
                } else if (v === "true" || v === "false") {
                    envObj[key] = v === "true";
                } else {
                    envObj[key] = v;
                }
            }
        }
    });
    return envObj;
};

const configFile = () => {
    return `${filePath}${fileName}.js`;
};

const changeDebugConfig = (key, configs, version = 1) => {
    if (!configs || configs.length === 0) {
        return;
    }

    const debugFile = configFile();
    const debugFilePath = path.join(projectPath(), debugFile);

    if (fs.existsSync(debugFilePath)) {
        fs.unlinkSync(debugFilePath);
        const debugFilePathMeta = path.join(projectPath(), `${debugFile}.meta`);
        fs.unlinkSync(debugFilePathMeta);
    }

    configs["currentEnv"] = key;
    const fileContent = JSON.stringify(configs);

    const content = `const version = ${version};\r\nconst config = ${fileContent}\r\nexports.config=config;`;

    // 写入文件
    fs.writeFileSync(debugFilePath, content);
};

const getWxOriginConfig = () => {
    const wxFileConfigFile = path.join(projectPath(), `${filePath}${wxConfigFileName}.js`);
    if (!fs.existsSync(wxFileConfigFile)) {
        return null;
    }

    const content = fs.readFileSync(wxFileConfigFile, "utf-8");
    return content;
};

const saveWxConfigFile = (config) => {
    const wxFileConfigFile = path.join(projectPath(), `${filePath}${wxConfigFileName}.js`);
    fs.writeFileSync(wxFileConfigFile, config);
};

const setWxConfigState = (state) => {
    const fileContent = getWxOriginConfig();
    if (!fileContent) {
        Editor.error("未找到微信配置文件");
        return;
    }

    if (state) {
        const debugFile = configFile();
        const debugFilePath = path.join(projectPath(), debugFile);

        if (fs.existsSync(debugFilePath)) {
            fs.unlinkSync(debugFilePath);
            const debugFilePathMeta = path.join(projectPath(), `${debugFile}.meta`);
            fs.unlinkSync(debugFilePathMeta);
        }

        let newFile = fileContent.replace(/isSubpackage: false,/g, `isSubpackage: true,`);
        newFile = newFile.replace(/needSDKUid: false,/g, `needSDKUid: true,`);
        saveWxConfigFile(newFile);
        Editor.log("wx channel build start");
    } else {
        let newFile = fileContent.replace(/isSubpackage: true,/g, `isSubpackage: false,`);
        newFile = newFile.replace(/needSDKUid: true,/g, `needSDKUid: false,`);
        saveWxConfigFile(newFile);
        Editor.log("wx channel build complete");
    }
};

exports.loadEnv = loadEnv;
exports.projectPath = projectPath;
exports.changeDebugConfig = changeDebugConfig;
exports.configFile = configFile;
exports.filePath = filePath;
exports.setWxConfigState = setWxConfigState;
