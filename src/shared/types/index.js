"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChartType = exports.AIProvider = exports.DatabaseType = void 0;
// 数据源类型
var DatabaseType;
(function (DatabaseType) {
    DatabaseType["PostgreSQL"] = "postgresql";
    DatabaseType["MySQL"] = "mysql";
    DatabaseType["MongoDB"] = "mongodb";
})(DatabaseType || (exports.DatabaseType = DatabaseType = {}));
// AI 服务类型
var AIProvider;
(function (AIProvider) {
    AIProvider["OpenAI"] = "openai";
    AIProvider["Claude"] = "claude";
    AIProvider["MiniMax"] = "minimax";
    AIProvider["GLM"] = "glm";
})(AIProvider || (exports.AIProvider = AIProvider = {}));
// 报表类型
var ChartType;
(function (ChartType) {
    ChartType["Line"] = "line";
    ChartType["Bar"] = "bar";
    ChartType["Pie"] = "pie";
    ChartType["Funnel"] = "funnel";
    ChartType["Heatmap"] = "heatmap";
})(ChartType || (exports.ChartType = ChartType = {}));
