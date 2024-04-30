const fs = require("fs");
const path = require("path");

const projectPath = () => {
    return Editor.Project.path;
};

const filePath = `/assets/scripts/Game/config/`;
const fileName = `AftGameConfigDebug`;

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

const changeDebugConfig = (configs, version = 1) => {
    if (!configs || configs.length === 0) {
        return;
    }

    const debugFilePath = path.join(projectPath(), configFile());
    // 先把原来的文件删了
    if (fs.existsSync(debugFilePath)) {
        fs.unlinkSync(debugFilePath);
        const debugFilePathMeta = path.join(projectPath(), `${filePath}${fileName}.js.meta`);
        fs.unlinkSync(debugFilePathMeta);
    }
    const fileContent = JSON.stringify(configs);

    const content = `const version = ${version};\r\nconst config = ${fileContent}\r\nexports.config=config;`;

    // 写入文件
    fs.writeFileSync(debugFilePath, content);
};
exports.loadEnv = loadEnv;
exports.projectPath = projectPath;
exports.changeDebugConfig = changeDebugConfig;
exports.configFile = configFile;
exports.filePath = filePath;
