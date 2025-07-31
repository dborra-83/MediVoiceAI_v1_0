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
var _a = require('@aws-sdk/client-s3'), S3Client = _a.S3Client, PutObjectCommand = _a.PutObjectCommand;
var uuidv4 = require('uuid').v4;
var s3Client = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });
exports.handler = function (event) { return __awaiter(_this, void 0, void 0, function () {
    var corsHeaders, body, audioData, fileName, contentType, doctorId, user, userId, currentDoctorId, audioBuffer, fileExtension, audioKey, timestamp, uploadParams, uploadResult, error_1;
    var _a, _b;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                console.log('=== UPLOAD AUDIO TO S3 ===');
                console.log('Event:', JSON.stringify(event, null, 2));
                corsHeaders = {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token',
                    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
                };
                _c.label = 1;
            case 1:
                _c.trys.push([1, 4, , 5]);
                // Handle OPTIONS preflight request
                if (event.httpMethod === 'OPTIONS') {
                    return [2 /*return*/, {
                            statusCode: 200,
                            headers: corsHeaders,
                            body: ''
                        }];
                }
                if (!(event.httpMethod === 'POST')) return [3 /*break*/, 3];
                console.log('Handling POST request for uploadAudio');
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
                audioData = body.audioData, fileName = body.fileName, contentType = body.contentType, doctorId = body.doctorId;
                // Validate required fields
                if (!audioData) {
                    return [2 /*return*/, {
                            statusCode: 400,
                            headers: __assign({ 'Content-Type': 'application/json' }, corsHeaders),
                            body: JSON.stringify({
                                error: 'audioData is required'
                            })
                        }];
                }
                user = (_b = (_a = event.requestContext) === null || _a === void 0 ? void 0 : _a.authorizer) === null || _b === void 0 ? void 0 : _b.claims;
                userId = (user === null || user === void 0 ? void 0 : user.sub) || 'anonymous';
                currentDoctorId = doctorId || userId;
                audioBuffer = Buffer.from(audioData, 'base64');
                // Validate file size (max 10MB)
                if (audioBuffer.length > 10 * 1024 * 1024) {
                    return [2 /*return*/, {
                            statusCode: 400,
                            headers: __assign({ 'Content-Type': 'application/json' }, corsHeaders),
                            body: JSON.stringify({
                                error: 'File too large (maximum 10MB)'
                            })
                        }];
                }
                fileExtension = fileName ? fileName.split('.').pop() : 'webm';
                audioKey = "audio/".concat(currentDoctorId, "/").concat(Date.now(), "-").concat(uuidv4(), ".").concat(fileExtension);
                timestamp = new Date().toISOString();
                console.log("Uploading to S3: ".concat(audioKey));
                uploadParams = {
                    Bucket: process.env.AUDIO_BUCKET_NAME,
                    Key: audioKey,
                    Body: audioBuffer,
                    ContentType: contentType || 'audio/webm',
                    Metadata: {
                        'doctor-id': currentDoctorId,
                        'user-id': userId,
                        'uploaded-at': timestamp,
                        'original-filename': fileName || 'recording.webm'
                    },
                    ServerSideEncryption: 'AES256'
                };
                return [4 /*yield*/, s3Client.send(new PutObjectCommand(uploadParams))];
            case 2:
                uploadResult = _c.sent();
                console.log('Upload successful:', uploadResult);
                return [2 /*return*/, {
                        statusCode: 200,
                        headers: __assign({ 'Content-Type': 'application/json' }, corsHeaders),
                        body: JSON.stringify({
                            success: true,
                            audioKey: audioKey,
                            fileName: fileName || 'recording.webm',
                            size: audioBuffer.length,
                            uploadedAt: timestamp,
                            doctorId: currentDoctorId,
                            s3ETag: uploadResult.ETag,
                            services: {
                                storage: "Amazon S3"
                            }
                        })
                    }];
            case 3: 
            // Method not allowed
            return [2 /*return*/, {
                    statusCode: 405,
                    headers: __assign({ 'Content-Type': 'application/json' }, corsHeaders),
                    body: JSON.stringify({
                        error: 'Method not allowed',
                        method: event.httpMethod
                    })
                }];
            case 4:
                error_1 = _c.sent();
                console.error('UPLOAD AUDIO ERROR:', error_1);
                console.error('Stack:', error_1.stack);
                return [2 /*return*/, {
                        statusCode: 500,
                        headers: __assign({ 'Content-Type': 'application/json' }, corsHeaders),
                        body: JSON.stringify({
                            error: 'Internal server error',
                            message: error_1.message,
                            timestamp: new Date().toISOString()
                        })
                    }];
            case 5: return [2 /*return*/];
        }
    });
}); };
//# sourceMappingURL=uploadAudio.js.map