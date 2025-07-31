var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
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
var _a = require('@aws-sdk/client-s3'), S3Client = _a.S3Client, GetObjectCommand = _a.GetObjectCommand;
var _b = require('@aws-sdk/client-transcribe'), TranscribeClient = _b.TranscribeClient, StartMedicalTranscriptionJobCommand = _b.StartMedicalTranscriptionJobCommand, GetMedicalTranscriptionJobCommand = _b.GetMedicalTranscriptionJobCommand;
var _c = require('@aws-sdk/client-bedrock-runtime'), BedrockRuntimeClient = _c.BedrockRuntimeClient, InvokeModelCommand = _c.InvokeModelCommand;
var DynamoDBClient = require('@aws-sdk/client-dynamodb').DynamoDBClient;
var _d = require('@aws-sdk/lib-dynamodb'), DynamoDBDocumentClient = _d.DynamoDBDocumentClient, PutCommand = _d.PutCommand, GetCommand = _d.GetCommand;
var uuidv4 = require('uuid').v4;
var s3Client = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });
var transcribeClient = new TranscribeClient({ region: process.env.AWS_REGION || 'us-east-1' });
var bedrockClient = new BedrockRuntimeClient({ region: process.env.AWS_REGION || 'us-east-1' });
var dynamoClient = DynamoDBDocumentClient.from(new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' }));
// Helper function to wait for transcription job completion
var waitForTranscriptionCompletion = function (jobName, maxWaitTime) {
    if (maxWaitTime === void 0) { maxWaitTime = 300000; }
    return __awaiter(_this, void 0, void 0, function () {
        var startTime, response, status;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    startTime = Date.now();
                    _a.label = 1;
                case 1:
                    if (!(Date.now() - startTime < maxWaitTime)) return [3 /*break*/, 4];
                    return [4 /*yield*/, transcribeClient.send(new GetMedicalTranscriptionJobCommand({
                            MedicalTranscriptionJobName: jobName
                        }))];
                case 2:
                    response = _a.sent();
                    status = response.MedicalTranscriptionJob.TranscriptionJobStatus;
                    if (status === 'COMPLETED') {
                        return [2 /*return*/, response.MedicalTranscriptionJob];
                    }
                    else if (status === 'FAILED') {
                        throw new Error("Transcription job failed: ".concat(response.MedicalTranscriptionJob.FailureReason));
                    }
                    // Wait 5 seconds before checking again
                    return [4 /*yield*/, new Promise(function (resolve) { return setTimeout(resolve, 5000); })];
                case 3:
                    // Wait 5 seconds before checking again
                    _a.sent();
                    return [3 /*break*/, 1];
                case 4: throw new Error('Transcription job timed out');
            }
        });
    });
};
// Helper function to get medical prompt based on specialty
var getMedicalPrompt = function (specialty) { return __awaiter(_this, void 0, void 0, function () {
    var response, error_1;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                return [4 /*yield*/, dynamoClient.send(new GetCommand({
                        TableName: process.env.PROMPTS_TABLE,
                        Key: {
                            prompt_id: 'medical-analysis',
                            specialty: specialty || 'general'
                        }
                    }))];
            case 1:
                response = _a.sent();
                if (response.Item) {
                    return [2 /*return*/, response.Item.content];
                }
                return [3 /*break*/, 3];
            case 2:
                error_1 = _a.sent();
                console.warn('Could not fetch custom prompt, using default:', error_1);
                return [3 /*break*/, 3];
            case 3: 
            // Default medical analysis prompt
            return [2 /*return*/, "Como m\u00E9dico especialista, analiza la siguiente transcripci\u00F3n de una consulta m\u00E9dica y proporciona:\n\n1. RESUMEN CL\u00CDNICO:\n   - Motivo de consulta principal\n   - S\u00EDntomas presentes\n   - Antecedentes relevantes mencionados\n\n2. IMPRESI\u00D3N DIAGN\u00D3STICA:\n   - Diagn\u00F3stico principal probable\n   - Diagn\u00F3sticos diferenciales a considerar\n   - Nivel de urgencia (bajo/medio/alto)\n\n3. PLAN TERAP\u00C9UTICO:\n   - Medicamentos recomendados (con dosis espec\u00EDficas)\n   - Ex\u00E1menes complementarios necesarios\n   - Recomendaciones de seguimiento\n\n4. OBSERVACIONES:\n   - Signos de alarma a vigilar\n   - Recomendaciones al paciente\n   - Pr\u00F3xima cita sugerida\n\nMant\u00E9n un lenguaje m\u00E9dico profesional pero comprensible. Si la informaci\u00F3n es insuficiente, ind\u00EDcalo claramente.\n\nTranscripci\u00F3n a analizar:"];
        }
    });
}); };
exports.handler = function (event) { return __awaiter(_this, void 0, void 0, function () {
    var corsHeaders, body, audioKey, patientId, doctorId, _a, specialty, user, userId, currentDoctorId, currentPatientId, consultationId, timestamp, jobName, s3Uri, transcriptionJob, transcriptionKey, transcriptionResponse, transcriptionData, _b, _c, transcriptionText, medicalPrompt, bedrockPayload, bedrockResponse, aiAnalysisResult, aiAnalysis, consultationData, error_2;
    var _d, _e;
    return __generator(this, function (_f) {
        switch (_f.label) {
            case 0:
                corsHeaders = {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token',
                    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
                };
                console.log('=== PROCESS AUDIO WITH AWS SERVICES ===');
                console.log('httpMethod:', event.httpMethod);
                _f.label = 1;
            case 1:
                _f.trys.push([1, 10, , 11]);
                // Handle OPTIONS preflight request
                if (event.httpMethod === 'OPTIONS') {
                    return [2 /*return*/, {
                            statusCode: 200,
                            headers: corsHeaders,
                            body: ''
                        }];
                }
                if (!(event.httpMethod === 'POST')) return [3 /*break*/, 9];
                console.log('Processing audio with AWS Transcribe Medical and Bedrock');
                body = void 0;
                try {
                    body = JSON.parse(event.body);
                }
                catch (error) {
                    console.error('Error parsing body:', error);
                    return [2 /*return*/, {
                            statusCode: 400,
                            headers: __assign({ 'Content-Type': 'application/json' }, corsHeaders),
                            body: JSON.stringify({ error: 'Invalid JSON body' })
                        }];
                }
                audioKey = body.audioKey, patientId = body.patientId, doctorId = body.doctorId, _a = body.specialty, specialty = _a === void 0 ? 'general' : _a;
                if (!audioKey) {
                    return [2 /*return*/, {
                            statusCode: 400,
                            headers: __assign({ 'Content-Type': 'application/json' }, corsHeaders),
                            body: JSON.stringify({
                                error: 'audioKey is required'
                            })
                        }];
                }
                user = (_e = (_d = event.requestContext) === null || _d === void 0 ? void 0 : _d.authorizer) === null || _e === void 0 ? void 0 : _e.claims;
                userId = (user === null || user === void 0 ? void 0 : user.sub) || 'anonymous';
                currentDoctorId = doctorId || userId;
                currentPatientId = patientId || "patient-".concat(Date.now());
                consultationId = uuidv4();
                timestamp = new Date().toISOString();
                console.log("Processing audio: ".concat(audioKey));
                jobName = "transcription-".concat(consultationId);
                s3Uri = "s3://".concat(process.env.AUDIO_BUCKET_NAME, "/").concat(audioKey);
                console.log('Starting Transcribe Medical job:', jobName);
                return [4 /*yield*/, transcribeClient.send(new StartMedicalTranscriptionJobCommand({
                        MedicalTranscriptionJobName: jobName,
                        LanguageCode: 'es-ES',
                        Specialty: 'PRIMARYCARE',
                        Type: 'CONVERSATION',
                        Media: {
                            MediaFileUri: s3Uri
                        },
                        OutputBucketName: process.env.AUDIO_BUCKET_NAME,
                        OutputKey: "transcriptions/".concat(consultationId, ".json"),
                        Settings: {
                            ShowSpeakerLabels: true,
                            MaxSpeakerLabels: 2
                        }
                    }))
                    // 2. Wait for transcription completion
                ];
            case 2:
                _f.sent();
                // 2. Wait for transcription completion
                console.log('Waiting for transcription completion...');
                return [4 /*yield*/, waitForTranscriptionCompletion(jobName)
                    // 3. Get transcription results from S3
                ];
            case 3:
                transcriptionJob = _f.sent();
                transcriptionKey = "transcriptions/".concat(consultationId, ".json");
                return [4 /*yield*/, s3Client.send(new GetObjectCommand({
                        Bucket: process.env.AUDIO_BUCKET_NAME,
                        Key: transcriptionKey
                    }))];
            case 4:
                transcriptionResponse = _f.sent();
                _c = (_b = JSON).parse;
                return [4 /*yield*/, transcriptionResponse.Body.transformToString()];
            case 5:
                transcriptionData = _c.apply(_b, [_f.sent()]);
                transcriptionText = transcriptionData.results.transcripts[0].transcript;
                console.log('Transcription completed:', transcriptionText.substring(0, 100) + '...');
                return [4 /*yield*/, getMedicalPrompt(specialty)
                    // 5. Analyze with Amazon Bedrock (Claude 3 Sonnet)
                ];
            case 6:
                medicalPrompt = _f.sent();
                // 5. Analyze with Amazon Bedrock (Claude 3 Sonnet)
                console.log('Analyzing with Amazon Bedrock Claude 3 Sonnet...');
                bedrockPayload = {
                    anthropic_version: "bedrock-2023-05-31",
                    max_tokens: 2000,
                    messages: [
                        {
                            role: "user",
                            content: "".concat(medicalPrompt, "\n\n").concat(transcriptionText)
                        }
                    ]
                };
                return [4 /*yield*/, bedrockClient.send(new InvokeModelCommand({
                        modelId: process.env.BEDROCK_MODEL_ID || 'anthropic.claude-3-sonnet-20240229-v1:0',
                        contentType: 'application/json',
                        body: JSON.stringify(bedrockPayload)
                    }))];
            case 7:
                bedrockResponse = _f.sent();
                aiAnalysisResult = JSON.parse(new TextDecoder().decode(bedrockResponse.body));
                aiAnalysis = aiAnalysisResult.content[0].text;
                console.log('AI analysis completed');
                consultationData = {
                    consultation_id: consultationId,
                    doctor_id: currentDoctorId,
                    patient_id: currentPatientId,
                    audio_key: audioKey,
                    transcription: transcriptionText,
                    ai_analysis: aiAnalysis,
                    specialty: specialty,
                    status: 'completed',
                    created_at: timestamp,
                    updated_at: timestamp
                };
                return [4 /*yield*/, dynamoClient.send(new PutCommand({
                        TableName: process.env.CONSULTATIONS_TABLE,
                        Item: consultationData
                    }))];
            case 8:
                _f.sent();
                console.log('Consultation saved to DynamoDB:', consultationId);
                return [2 /*return*/, {
                        statusCode: 200,
                        headers: __assign({ 'Content-Type': 'application/json' }, corsHeaders),
                        body: JSON.stringify({
                            success: true,
                            consultationId: consultationId,
                            transcription: transcriptionText,
                            aiAnalysis: aiAnalysis,
                            timestamp: timestamp,
                            patientId: currentPatientId,
                            doctorId: currentDoctorId,
                            specialty: specialty,
                            services: {
                                transcription: "Amazon Transcribe Medical",
                                analysis: "Amazon Bedrock Claude 3 Sonnet",
                                storage: "Amazon DynamoDB"
                            }
                        })
                    }];
            case 9: 
            // Method not allowed
            return [2 /*return*/, {
                    statusCode: 405,
                    headers: __assign({ 'Content-Type': 'application/json' }, corsHeaders),
                    body: JSON.stringify({
                        error: 'Method not allowed',
                        method: event.httpMethod
                    })
                }];
            case 10:
                error_2 = _f.sent();
                console.error('PROCESS AUDIO ERROR:', error_2);
                console.error('Stack:', error_2.stack);
                return [2 /*return*/, {
                        statusCode: 500,
                        headers: __assign({ 'Content-Type': 'application/json' }, corsHeaders),
                        body: JSON.stringify({
                            error: 'Internal server error',
                            message: error_2.message,
                            timestamp: new Date().toISOString(),
                            details: process.env.NODE_ENV === 'development' ? error_2.stack : undefined
                        })
                    }];
            case 11: return [2 /*return*/];
        }
    });
}); };
//# sourceMappingURL=processAudio.js.map