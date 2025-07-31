var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var _this = this;
var DynamoDBClient = require('@aws-sdk/client-dynamodb').DynamoDBClient;
var _a = require('@aws-sdk/lib-dynamodb'), DynamoDBDocumentClient = _a.DynamoDBDocumentClient, QueryCommand = _a.QueryCommand, ScanCommand = _a.ScanCommand;
var dynamoClient = DynamoDBDocumentClient.from(new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' }));
// Función auxiliar para formatear fecha
var formatDate = function (dateString) {
    try {
        return new Date(dateString).toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }
    catch (error) {
        return dateString;
    }
};
// Función auxiliar para extraer resumen del análisis de IA
var extractSummary = function (aiAnalysis, maxLength) {
    if (maxLength === void 0) { maxLength = 200; }
    if (!aiAnalysis)
        return 'Sin análisis disponible';
    try {
        // Buscar la sección de resumen clínico
        var lines = aiAnalysis.split('\n');
        var summary = '';
        var inSummarySection = false;
        for (var _i = 0, lines_1 = lines; _i < lines_1.length; _i++) {
            var line = lines_1[_i];
            var trimmedLine = line.trim();
            if (trimmedLine.toLowerCase().includes('resumen') ||
                trimmedLine.toLowerCase().includes('motivo')) {
                inSummarySection = true;
                continue;
            }
            if (inSummarySection && trimmedLine.toLowerCase().includes('diagnóstico')) {
                break;
            }
            if (inSummarySection && trimmedLine.length > 0 &&
                !trimmedLine.startsWith('#') && !trimmedLine.startsWith('-')) {
                summary += trimmedLine + ' ';
                if (summary.length > maxLength) {
                    break;
                }
            }
        }
        // Si no se encontró resumen estructurado, tomar las primeras líneas
        if (!summary.trim()) {
            summary = aiAnalysis.split('\n')
                .filter(function (line) { return line.trim().length > 0; })
                .slice(0, 3)
                .join(' ');
        }
        // Truncar y limpiar
        if (summary.length > maxLength) {
            summary = summary.substring(0, maxLength).trim() + '...';
        }
        return summary.trim() || 'Sin resumen disponible';
    }
    catch (error) {
        console.error('Error extrayendo resumen:', error);
        return 'Error procesando análisis';
    }
};
exports.handler = function (event) { return __awaiter(_this, void 0, void 0, function () {
    var user, queryParams, doctorId, patientId, _a, limit, startKey, specialty, dateFrom, dateTo, queryCommand, items, queryParams_1, filterExpressions, response, result, queryParams_2, response, result, scanParams, filterExpressions, response, result, error_1;
    var _b;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                _c.trys.push([0, 7, , 8]);
                console.log('Obteniendo historial:', JSON.stringify(event, null, 2));
                user = (_b = event.requestContext.authorizer) === null || _b === void 0 ? void 0 : _b.claims;
                if (!user) {
                    return [2 /*return*/, {
                            statusCode: 401,
                            headers: {
                                'Content-Type': 'application/json',
                                'Access-Control-Allow-Origin': '*',
                                'Access-Control-Allow-Headers': 'Content-Type,Authorization',
                                'Access-Control-Allow-Methods': 'GET,OPTIONS'
                            },
                            body: JSON.stringify({ error: 'No autorizado' })
                        }];
                }
                queryParams = event.queryStringParameters || {};
                doctorId = queryParams.doctorId, patientId = queryParams.patientId, _a = queryParams.limit, limit = _a === void 0 ? '20' : _a, startKey = queryParams.startKey, specialty = queryParams.specialty, dateFrom = queryParams.dateFrom, dateTo = queryParams.dateTo;
                queryCommand = void 0;
                items = [];
                if (!doctorId) return [3 /*break*/, 2];
                queryParams_1 = {
                    TableName: process.env.CONSULTATIONS_TABLE,
                    IndexName: 'DateIndex',
                    KeyConditionExpression: 'doctor_id = :doctorId',
                    ExpressionAttributeValues: {
                        ':doctorId': doctorId
                    },
                    ScanIndexForward: false,
                    Limit: parseInt(limit)
                };
                // Agregar filtros adicionales
                if (startKey) {
                    queryParams_1.ExclusiveStartKey = JSON.parse(decodeURIComponent(startKey));
                }
                if (patientId || specialty || dateFrom || dateTo) {
                    filterExpressions = [];
                    if (patientId) {
                        queryParams_1.ExpressionAttributeValues[':patientId'] = patientId;
                        filterExpressions.push('patient_id = :patientId');
                    }
                    if (specialty) {
                        queryParams_1.ExpressionAttributeValues[':specialty'] = specialty;
                        filterExpressions.push('specialty = :specialty');
                    }
                    if (dateFrom) {
                        queryParams_1.ExpressionAttributeValues[':dateFrom'] = dateFrom;
                        filterExpressions.push('created_at >= :dateFrom');
                    }
                    if (dateTo) {
                        queryParams_1.ExpressionAttributeValues[':dateTo'] = dateTo;
                        filterExpressions.push('created_at <= :dateTo');
                    }
                    if (filterExpressions.length > 0) {
                        queryParams_1.FilterExpression = filterExpressions.join(' AND ');
                    }
                }
                return [4 /*yield*/, dynamoClient.send(new QueryCommand(queryParams_1))];
            case 1:
                response = _c.sent();
                items = response.Items || [];
                result = {
                    consultations: items.map(function (item) { return ({
                        consultationId: item.consultation_id,
                        doctorId: item.doctor_id,
                        patientId: item.patient_id,
                        specialty: item.specialty || 'General',
                        createdAt: item.created_at,
                        formattedDate: formatDate(item.created_at),
                        status: item.status || 'completed',
                        summary: extractSummary(item.ai_analysis),
                        hasTranscription: !!item.transcription,
                        hasAiAnalysis: !!item.ai_analysis,
                        audioKey: item.audio_key
                    }); }),
                    count: items.length,
                    lastEvaluatedKey: response.LastEvaluatedKey ?
                        encodeURIComponent(JSON.stringify(response.LastEvaluatedKey)) : null
                };
                return [2 /*return*/, {
                        statusCode: 200,
                        headers: {
                            'Content-Type': 'application/json',
                            'Access-Control-Allow-Origin': '*',
                            'Access-Control-Allow-Headers': 'Content-Type,Authorization',
                            'Access-Control-Allow-Methods': 'GET,OPTIONS'
                        },
                        body: JSON.stringify(result)
                    }];
            case 2:
                if (!patientId) return [3 /*break*/, 4];
                queryParams_2 = {
                    TableName: process.env.CONSULTATIONS_TABLE,
                    IndexName: 'PatientIndex',
                    KeyConditionExpression: 'patient_id = :patientId',
                    ExpressionAttributeValues: {
                        ':patientId': patientId
                    },
                    ScanIndexForward: false,
                    Limit: parseInt(limit)
                };
                if (startKey) {
                    queryParams_2.ExclusiveStartKey = JSON.parse(decodeURIComponent(startKey));
                }
                return [4 /*yield*/, dynamoClient.send(new QueryCommand(queryParams_2))];
            case 3:
                response = _c.sent();
                items = response.Items || [];
                result = {
                    consultations: items.map(function (item) { return ({
                        consultationId: item.consultation_id,
                        doctorId: item.doctor_id,
                        patientId: item.patient_id,
                        specialty: item.specialty || 'General',
                        createdAt: item.created_at,
                        formattedDate: formatDate(item.created_at),
                        status: item.status || 'completed',
                        summary: extractSummary(item.ai_analysis),
                        hasTranscription: !!item.transcription,
                        hasAiAnalysis: !!item.ai_analysis,
                        audioKey: item.audio_key
                    }); }),
                    count: items.length,
                    lastEvaluatedKey: response.LastEvaluatedKey ?
                        encodeURIComponent(JSON.stringify(response.LastEvaluatedKey)) : null
                };
                return [2 /*return*/, {
                        statusCode: 200,
                        headers: {
                            'Content-Type': 'application/json',
                            'Access-Control-Allow-Origin': '*',
                            'Access-Control-Allow-Headers': 'Content-Type,Authorization',
                            'Access-Control-Allow-Methods': 'GET,OPTIONS'
                        },
                        body: JSON.stringify(result)
                    }];
            case 4:
                scanParams = {
                    TableName: process.env.CONSULTATIONS_TABLE,
                    Limit: parseInt(limit)
                };
                if (startKey) {
                    scanParams.ExclusiveStartKey = JSON.parse(decodeURIComponent(startKey));
                }
                // Agregar filtros si se proporcionan
                if (specialty || dateFrom || dateTo) {
                    filterExpressions = [];
                    scanParams.ExpressionAttributeValues = {};
                    if (specialty) {
                        scanParams.ExpressionAttributeValues[':specialty'] = specialty;
                        filterExpressions.push('specialty = :specialty');
                    }
                    if (dateFrom) {
                        scanParams.ExpressionAttributeValues[':dateFrom'] = dateFrom;
                        filterExpressions.push('created_at >= :dateFrom');
                    }
                    if (dateTo) {
                        scanParams.ExpressionAttributeValues[':dateTo'] = dateTo;
                        filterExpressions.push('created_at <= :dateTo');
                    }
                    if (filterExpressions.length > 0) {
                        scanParams.FilterExpression = filterExpressions.join(' AND ');
                    }
                }
                return [4 /*yield*/, dynamoClient.send(new ScanCommand(scanParams))];
            case 5:
                response = _c.sent();
                items = response.Items || [];
                // Ordenar por fecha de creación descendente
                items.sort(function (a, b) { return new Date(b.created_at) - new Date(a.created_at); });
                result = {
                    consultations: items.map(function (item) { return ({
                        consultationId: item.consultation_id,
                        doctorId: item.doctor_id,
                        patientId: item.patient_id,
                        specialty: item.specialty || 'General',
                        createdAt: item.created_at,
                        formattedDate: formatDate(item.created_at),
                        status: item.status || 'completed',
                        summary: extractSummary(item.ai_analysis),
                        hasTranscription: !!item.transcription,
                        hasAiAnalysis: !!item.ai_analysis,
                        audioKey: item.audio_key
                    }); }),
                    count: items.length,
                    lastEvaluatedKey: response.LastEvaluatedKey ?
                        encodeURIComponent(JSON.stringify(response.LastEvaluatedKey)) : null
                };
                return [2 /*return*/, {
                        statusCode: 200,
                        headers: {
                            'Content-Type': 'application/json',
                            'Access-Control-Allow-Origin': '*',
                            'Access-Control-Allow-Headers': 'Content-Type,Authorization',
                            'Access-Control-Allow-Methods': 'GET,OPTIONS'
                        },
                        body: JSON.stringify(result)
                    }];
            case 6: return [3 /*break*/, 8];
            case 7:
                error_1 = _c.sent();
                console.error('Error obteniendo historial:', error_1);
                return [2 /*return*/, {
                        statusCode: 500,
                        headers: {
                            'Content-Type': 'application/json',
                            'Access-Control-Allow-Origin': '*',
                            'Access-Control-Allow-Headers': 'Content-Type,Authorization',
                            'Access-Control-Allow-Methods': 'GET,OPTIONS'
                        },
                        body: JSON.stringify({
                            error: 'Error interno del servidor',
                            message: error_1.message,
                            details: process.env.NODE_ENV === 'development' ? error_1.stack : undefined
                        })
                    }];
            case 8: return [2 /*return*/];
        }
    });
}); };
//# sourceMappingURL=getHistory.js.map