"use strict";
const fs = require("fs");
const { exec } = require("child_process");

//在重写Editor.Menu之前，先持有其引用，在必要的时候可以还原回去
//并且这一行必须写在文件前面，因为CustomMenu需要继承Editor.Menu,
//但是又不能直接extends Editor.Menu，因为Editor.Menu本身会被CustomMenu覆盖
if (!Editor.__Menu__) {
    Editor.__Menu__ = Editor.Menu;
}

const ExportTextType = {
    Js: 0,
    ES6: 1,
};

module.exports = {
    load() {
        // execute when package loaded
        Editor.Menu = CustomMenu; //应用自定义菜单
    },

    unload() {
        // execute when package unloaded
        Editor.Menu = Editor.__Menu__; //恢复原来的菜单逻辑
    },

    // register your ipc messages here
    messages: {
        active() {
            Editor.Menu = CustomMenu;
            Editor.log("已启用自定义上下文菜单");
        },
        disactive() {
            Editor.Menu = Editor.__Menu__;
            Editor.log("已停用自定义上下文菜单");
        },
    },
};

//template菜单模版
//https://docs.cocos.com/creator/2.4/api/zh/editor/main/menu.html
class CustomMenu extends Editor.__Menu__ {
    constructor(template, webContent) {
        //打印编辑器默认菜单数据
        // Editor.log(template);

        let menuLocation; //菜单所在区域

        //判断是哪种菜单，暂时没有找到很优雅的办法
        //构造函数的template是编辑器自带的菜单配置数组，
        //可以添加/删除/重写template的元素实现自定义菜单功能
        if (template.length > 0) {
            let first = template[0];
            if (first.label == "创建节点")
                //场景节点右键菜单
                menuLocation = "node";
            else if (first.label == "新建")
                //asset右键菜单
                menuLocation = "asset";
            else if (first.label == "Remove")
                //脚本组件菜单
                menuLocation = "component";
            else if (first.path && first.path.startsWith("渲染组件"))
                //添加组件菜单
                menuLocation = "addcomponent";
            //还有其他区域的菜单比如控制台面板菜单，就不再列举了
        }

        if (menuLocation == "asset") {
            //TODO 在这里插入asset右键菜单
            let assetInfo = getSelectedFirstAssetInfo();

            //Editor.log(assetInfo);

            template.push({ type: "separator" });
            template.push({
                label: "复制资源 UUID",
                click: () => {
                    const clipboard = Editor.require("electron").clipboard;
                    clipboard.writeText(assetInfo.uuid);
                    Editor.log(assetInfo.uuid);
                },
            });
            template.push({
                label: "复制资源路径",
                click: () => {
                    const clipboard = Editor.require("electron").clipboard;
                    clipboard.writeText(assetInfo.url);
                    Editor.log(assetInfo.url);
                },
            });
        } else if (menuLocation == "node") {
            //在这里插入场景节点右键菜单
            let insertIndex = 1;

            template.splice(insertIndex++, 0, { type: "separator" });
            template.splice(insertIndex++, 0, {
                label: "创建Sprite（精灵）",
                click: template[0].submenu[1].submenu[0].click,
            });
            template.splice(insertIndex++, 0, { type: "separator" });

            let groupMenuEnable = true;
            let groupMenu = { label: "节点预处理", enabled: true, submenu: [] };

            template.splice(insertIndex++, 0, groupMenu);

            groupMenu.submenu.push({
                label: "导出全部节点",
                enabled: groupMenuEnable,
                click: () => {
                    getParamsCopyOfNode();
                },
            });
            groupMenu.submenu.push({
                label: "导出当前节点",
                enabled: groupMenuEnable,
                click: (node, args) => {
                    // const asset = getCurrentSelectedNode();
                    // const nodeMap = generatePrefabNodeMap(asset);
                    Editor.log("comming soon!");
                },
            });
            groupMenu.submenu.push({
                label: "导出全部节点（ES6）",
                enabled: groupMenuEnable,
                click: () => {
                    getParamsCopyOfNode(ExportTextType.ES6);
                },
            });
            groupMenu.submenu.push({
                label: "导出当前节点（ES6）",
                enabled: groupMenuEnable,
                click: () => {
                    Editor.log("comming soon!");
                },
            });
        } else if (menuLocation == "component") {
            //在这里插入组件菜单，可传递节点uuid，
            let params = template[0].params;
            //Editor.log(params);
            template.push({ type: "separator" });
            template.push({
                label: "测试组件脚本菜单",
                enabled: true,
                click: () => {
                    Editor.log("TODO: add user component script");
                },
            });
        } else if (menuLocation == "addcomponent") {
            //在这里插入添加组件菜单，可传递节点uuid
            let params = template[0].params;
            let nodeUuid = params[0];

            //添加选中节点的同名脚本
            template.unshift({ type: "separator" });
            template.unshift({
                label: "测试添加脚本菜单",
                enabled: true,
                click: () => {
                    Editor.log("TODO: add user custom scripts");
                },
            });
        }

        super(template, webContent);
    }
}

/**
 * 获取资源管理器中选中的第一个资源
 * @returns
 */
function getSelectedFirstAssetInfo() {
    let asset_selection = Editor.Selection.curSelection("asset");
    if (asset_selection == null || asset_selection.length == 0) {
        return null;
    }

    let info = Editor.assetdb.assetInfoByUuid(asset_selection[0]);

    return info;
}

const KEY_PREFAB_NODE_TYPE = "__type__";
const KEY_PREFAB_NODE_CHILDREN = "_children";
const KEY_PREFAB_NODE_NAME = "_name";
const KEY_PREFAB_NODE_CHILDREN_ID = "__id__";
const KEY_PREFAB_NODE_PAREN = "_parent";

function getCurrentSelectedNode() {
    const assets = Editor.Selection.curSelection("asset");
    if (!assets || assets.length == 0) {
        Editor.error("未选中节点");
        return null;
    }
    const uuid = assets[0];
    const info = Editor.assetdb.assetInfoByUuid(uuid);
    if (!info || info.path.indexOf(".prefab") < 0) {
        Editor.error("选中的节点文件不是prefab", info);
        return null;
    }
    return info;
}

function generatePrefabNodeMap(asset, texttype) {
    const nodeMap = {};

    const path = asset.path;
    const file = fs.readFileSync(path, "utf-8");
    const jsonNodeArr = JSON.parse(file);
    if (jsonNodeArr.length < 2) {
        Editor.error("还没有创建节点", asset.path);
        return;
    }

    // const ccNodes = jsonNodeArr.filter((node) => node[KEY_PREFAB_NODE_TYPE] == "cc.Node");
    const root = jsonNodeArr[1];
    const rootChildren = root[KEY_PREFAB_NODE_CHILDREN];
    if (!rootChildren || rootChildren.length == 0) {
        Editor.error("还没有添加节点", asset.path);
        return;
    }

    const nameMap = {};
    let count = 0;
    jsonNodeArr.forEach((node, index) => {
        const type = node[KEY_PREFAB_NODE_TYPE];
        if (type === "cc.Node" && index >= 1) {
            const parent = node[KEY_PREFAB_NODE_PAREN];
            let name = node[KEY_PREFAB_NODE_NAME];
            if (parent && parent[KEY_PREFAB_NODE_CHILDREN_ID]) {
                if (nameMap[name]) {
                    name = `${name}${index}`;
                } else {
                    nameMap[name] = 1;
                }
                let data = {
                    parent: {
                        name: jsonNodeArr[parent[KEY_PREFAB_NODE_CHILDREN_ID]][
                            KEY_PREFAB_NODE_NAME
                        ],
                        id: parent[KEY_PREFAB_NODE_CHILDREN_ID],
                    },
                    name: name,
                    isRoot: false,
                    index: index,
                };

                nodeMap[name] = data;

                data["path"] = getParamDeclare(
                    data,
                    node[KEY_PREFAB_NODE_NAME],
                    nodeMap
                );

                let text = "";
                if (texttype === ExportTextType.Js) {
                    text = `this.${name} = cc.find("${data["path"]}", this.node);`;
                } else if (texttype === ExportTextType.ES6) {
                    text = `get ${name}() {
    return this.node.getChildByName("${data["path"]}");
}\n`;
                }
                data["export"] = text;

                count++;
            } else {
                nodeMap[name] = {
                    parent: null,
                    name: name,
                    isRoot: true,
                    index: index,
                };
            }
        }
    });

    return nodeMap;
}

function getParamsCopyOfNode(texttype = ExportTextType.Js) {
    const asset = getCurrentSelectedNode();
    const nodeMap = generatePrefabNodeMap(asset, texttype);

    let params = ``;
    let count = 0;
    Object.keys(nodeMap).forEach((key) => {
        const exportStr = nodeMap[key]["export"];
        if (exportStr) {
            // Editor.log(`${exportStr}\n`) ;
            params += `${exportStr}\n`;
            count++;
        }
    });

    // Windows
    exec("clip").stdin.end(params);

    // Mac
    // exec("pbcopy").stdin.end(params);

    Editor.log(`export complete, total params count: ${count} .`);
}

function getParamDeclare(node, nodePath, nodeMap) {
    let parent = nodeMap[node.parent.name];
    if (!parent) {
        parent = nodeMap[`${node.parent.name}${node.parent.id}`];
    }
    if (!parent) {
        Editor.error("节点层级异常", node);
        throw new Error("节点层级异常", node);
    }
    if (parent.isRoot) {
        return nodePath;
    }

    const newPath = `${node.parent.name}/${nodePath}`;

    return getParamDeclare(nodeMap[node.parent.name], newPath, nodeMap);
}
