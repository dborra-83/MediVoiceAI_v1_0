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
var _a = require('@aws-sdk/client-s3'), S3Client = _a.S3Client, PutObjectCommand = _a.PutObjectCommand, GetObjectCommand = _a.GetObjectCommand;
var DynamoDBClient = require('@aws-sdk/client-dynamodb').DynamoDBClient;
var _b = require('@aws-sdk/lib-dynamodb'), DynamoDBDocumentClient = _b.DynamoDBDocumentClient, GetCommand = _b.GetCommand;
var jsPDF = require('jspdf');
var uuidv4 = require('uuid').v4;
var s3Client = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });
var dynamoClient = DynamoDBDocumentClient.from(new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' }));
// Función auxiliar para obtener datos del doctor
var getDoctorData = function (doctorId) { return __awaiter(_this, void 0, void 0, function () {
    var response, error_1;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                return [4 /*yield*/, dynamoClient.send(new GetCommand({
                        TableName: process.env.DOCTORS_TABLE,
                        Key: { doctor_id: doctorId }
                    }))];
            case 1:
                response = _a.sent();
                return [2 /*return*/, response.Item || {
                        name: 'Dr. Sin Nombre',
                        license_number: 'N/A',
                        specialty: 'Medicina General',
                        institution: 'Institución Médica',
                        phone: 'N/A',
                        address: 'Dirección no disponible'
                    }];
            case 2:
                error_1 = _a.sent();
                console.error('Error obteniendo datos del doctor:', error_1);
                return [2 /*return*/, {
                        name: 'Dr. Sin Nombre',
                        license_number: 'N/A',
                        specialty: 'Medicina General',
                        institution: 'Institución Médica',
                        phone: 'N/A',
                        address: 'Dirección no disponible'
                    }];
            case 3: return [2 /*return*/];
        }
    });
}); };
// Función auxiliar para parsear el análisis de IA y extraer medicamentos
var parseMedications = function (aiAnalysis) {
    var medications = [];
    try {
        // Buscar sección de medicamentos en el análisis
        var lines = aiAnalysis.split('\n');
        var inMedicationSection = false;
        for (var _i = 0, lines_1 = lines; _i < lines_1.length; _i++) {
            var line = lines_1[_i];
            var trimmedLine = line.trim();
            // Detectar inicio de sección de medicamentos
            if (trimmedLine.toLowerCase().includes('medicament') ||
                trimmedLine.toLowerCase().includes('tratamiento') ||
                trimmedLine.toLowerCase().includes('prescripción')) {
                inMedicationSection = true;
                continue;
            }
            // Detectar fin de sección de medicamentos
            if (inMedicationSection && (trimmedLine.toLowerCase().includes('control') ||
                trimmedLine.toLowerCase().includes('seguimiento') ||
                trimmedLine.toLowerCase().includes('observaciones'))) {
                break;
            }
            // Extraer medicamentos si estamos en la sección correcta
            if (inMedicationSection && trimmedLine.length > 0 &&
                (trimmedLine.startsWith('-') || trimmedLine.startsWith('•') || trimmedLine.match(/^\d+\./))) {
                var medication = trimmedLine.replace(/^[-•\d.\s]+/, '').trim();
                if (medication.length > 0) {
                    medications.push(medication);
                }
            }
        }
        // Si no se encontraron medicamentos en formato estructurado, buscar patrones comunes
        if (medications.length === 0) {
            var medicationPatterns = [
                /([A-Za-z]+\s*\d+\s*mg)/g,
                /([A-Za-z]+\s+\d+mg)/g,
                /(Paracetamol|Ibuprofeno|Amoxicilina|Aspirina|Omeprazol)[^.]*\./gi
            ];
            for (var _a = 0, medicationPatterns_1 = medicationPatterns; _a < medicationPatterns_1.length; _a++) {
                var pattern = medicationPatterns_1[_a];
                var matches = aiAnalysis.match(pattern);
                if (matches) {
                    medications.push.apply(medications, matches.slice(0, 5)); // Máximo 5 medicamentos
                    break;
                }
            }
        }
    }
    catch (error) {
        console.error('Error parseando medicamentos:', error);
    }
    // Medicamentos por defecto si no se encuentran
    if (medications.length === 0) {
        medications.push('Consultar análisis completo para medicamentos específicos');
    }
    return medications.slice(0, 10); // Máximo 10 medicamentos
};
// Función principal para generar PDF
var generatePrescriptionPDF = function (consultationData, doctorData) {
    var doc = new jsPDF();
    // Configuración de fuentes y colores
    doc.setFont('helvetica');
    // Header con logo y título
    doc.setFontSize(24);
    doc.setTextColor(41, 128, 185); // Azul médico
    doc.text('RECETA MÉDICA', 105, 25, { align: 'center' });
    // Línea decorativa
    doc.setDrawColor(41, 128, 185);
    doc.setLineWidth(1);
    doc.line(20, 30, 190, 30);
    // Información del doctor
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'bold');
    doc.text('DATOS DEL MÉDICO', 20, 45);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text("Nombre: ".concat(doctorData.name), 20, 55);
    doc.text("Especialidad: ".concat(doctorData.specialty), 20, 62);
    doc.text("Registro M\u00E9dico: ".concat(doctorData.license_number), 20, 69);
    doc.text("Instituci\u00F3n: ".concat(doctorData.institution), 20, 76);
    doc.text("Tel\u00E9fono: ".concat(doctorData.phone), 20, 83);
    // Información del paciente
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('DATOS DEL PACIENTE', 20, 100);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text("ID Paciente: ".concat(consultationData.patient_id), 20, 110);
    doc.text("Fecha de Consulta: ".concat(new Date(consultationData.created_at).toLocaleDateString('es-ES')), 20, 117);
    doc.text("Especialidad: ".concat(consultationData.specialty || 'General'), 20, 124);
    // Línea separadora
    doc.setDrawColor(200, 200, 200);
    doc.line(20, 135, 190, 135);
    // Prescripción médica
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(220, 20, 60); // Rojo médico
    doc.text('PRESCRIPCIÓN MÉDICA', 20, 150);
    // Extraer y mostrar medicamentos
    var medications = parseMedications(consultationData.ai_analysis);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    var yPosition = 165;
    medications.forEach(function (medication, index) {
        if (yPosition > 250) {
            doc.addPage();
            yPosition = 30;
        }
        doc.setFont('helvetica', 'bold');
        doc.text("".concat(index + 1, "."), 25, yPosition);
        doc.setFont('helvetica', 'normal');
        // Dividir líneas largas
        var splitText = doc.splitTextToSize(medication, 160);
        doc.text(splitText, 35, yPosition);
        yPosition += (splitText.length * 7) + 5;
    });
    // Espacio para análisis completo si hay espacio
    if (yPosition < 220) {
        yPosition += 10;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.text('OBSERVACIONES MÉDICAS', 20, yPosition);
        yPosition += 10;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        // Extraer primeras líneas del análisis
        var analysisLines = consultationData.ai_analysis.split('\n').slice(0, 8);
        analysisLines.forEach(function (line) {
            if (yPosition > 270)
                return;
            if (line.trim().length > 0) {
                var splitLine = doc.splitTextToSize(line.trim(), 170);
                doc.text(splitLine, 20, yPosition);
                yPosition += splitLine.length * 4;
            }
        });
    }
    // Footer
    var pageHeight = doc.internal.pageSize.height;
    doc.setFontSize(8);
    doc.setTextColor(128, 128, 128);
    doc.text("Generado: ".concat(new Date().toLocaleString('es-ES')), 20, pageHeight - 20);
    doc.text("ID Consulta: ".concat(consultationData.consultation_id), 20, pageHeight - 15);
    doc.text('Este documento fue generado automáticamente por MediVoice AI', 20, pageHeight - 10);
    // Firma del médico (espacio)
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text('_________________________', 130, pageHeight - 40);
    doc.text("".concat(doctorData.name), 130, pageHeight - 30);
    doc.text("Reg. ".concat(doctorData.license_number), 130, pageHeight - 25);
    return doc.output('arraybuffer');
};
exports.handler = function (event) { return __awaiter(_this, void 0, void 0, function () {
    var user, body, consultationId, doctorId, consultationResponse, doctorData, pdfBuffer, pdfKey, error_2;
    var _a;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 4, , 5]);
                console.log('Generando PDF:', JSON.stringify(event, null, 2));
                user = (_a = event.requestContext.authorizer) === null || _a === void 0 ? void 0 : _a.claims;
                if (!user) {
                    return [2 /*return*/, {
                            statusCode: 401,
                            headers: {
                                'Content-Type': 'application/json',
                                'Access-Control-Allow-Origin': '*',
                                'Access-Control-Allow-Headers': 'Content-Type,Authorization',
                                'Access-Control-Allow-Methods': 'POST,OPTIONS'
                            },
                            body: JSON.stringify({ error: 'No autorizado' })
                        }];
                }
                body = void 0;
                try {
                    body = JSON.parse(event.body);
                }
                catch (error) {
                    return [2 /*return*/, {
                            statusCode: 400,
                            headers: {
                                'Content-Type': 'application/json',
                                'Access-Control-Allow-Origin': '*',
                                'Access-Control-Allow-Headers': 'Content-Type,Authorization',
                                'Access-Control-Allow-Methods': 'POST,OPTIONS'
                            },
                            body: JSON.stringify({ error: 'Body inválido' })
                        }];
                }
                consultationId = body.consultationId, doctorId = body.doctorId;
                if (!consultationId || !doctorId) {
                    return [2 /*return*/, {
                            statusCode: 400,
                            headers: {
                                'Content-Type': 'application/json',
                                'Access-Control-Allow-Origin': '*',
                                'Access-Control-Allow-Headers': 'Content-Type,Authorization',
                                'Access-Control-Allow-Methods': 'POST,OPTIONS'
                            },
                            body: JSON.stringify({
                                error: 'consultationId y doctorId son requeridos'
                            })
                        }];
                }
                return [4 /*yield*/, dynamoClient.send(new GetCommand({
                        TableName: process.env.CONSULTATIONS_TABLE,
                        Key: {
                            consultation_id: consultationId,
                            doctor_id: doctorId
                        }
                    }))];
            case 1:
                consultationResponse = _b.sent();
                if (!consultationResponse.Item) {
                    return [2 /*return*/, {
                            statusCode: 404,
                            headers: {
                                'Content-Type': 'application/json',
                                'Access-Control-Allow-Origin': '*',
                                'Access-Control-Allow-Headers': 'Content-Type,Authorization',
                                'Access-Control-Allow-Methods': 'POST,OPTIONS'
                            },
                            body: JSON.stringify({ error: 'Consulta no encontrada' })
                        }];
                }
                return [4 /*yield*/, getDoctorData(doctorId)
                    // Generar PDF
                ];
            case 2:
                doctorData = _b.sent();
                pdfBuffer = generatePrescriptionPDF(consultationResponse.Item, doctorData);
                pdfKey = "pdfs/".concat(user.sub, "/").concat(consultationId, "/receta-").concat(Date.now(), ".pdf");
                return [4 /*yield*/, s3Client.send(new PutObjectCommand({
                        Bucket: process.env.PDF_BUCKET_NAME,
                        Key: pdfKey,
                        Body: pdfBuffer,
                        ContentType: 'application/pdf',
                        Metadata: {
                            'user-id': user.sub,
                            'consultation-id': consultationId,
                            'doctor-id': doctorId,
                            'generated-at': new Date().toISOString()
                        }
                    }))];
            case 3:
                _b.sent();
                console.log("PDF generado exitosamente: ".concat(pdfKey));
                return [2 /*return*/, {
                        statusCode: 200,
                        headers: {
                            'Content-Type': 'application/json',
                            'Access-Control-Allow-Origin': '*',
                            'Access-Control-Allow-Headers': 'Content-Type,Authorization',
                            'Access-Control-Allow-Methods': 'POST,OPTIONS'
                        },
                        body: JSON.stringify({
                            success: true,
                            pdfKey: pdfKey,
                            consultationId: consultationId,
                            doctorId: doctorId,
                            generatedAt: new Date().toISOString(),
                            downloadUrl: "https://".concat(process.env.PDF_BUCKET_NAME, ".s3.amazonaws.com/").concat(pdfKey)
                        })
                    }];
            case 4:
                error_2 = _b.sent();
                console.error('Error generando PDF:', error_2);
                return [2 /*return*/, {
                        statusCode: 500,
                        headers: {
                            'Content-Type': 'application/json',
                            'Access-Control-Allow-Origin': '*',
                            'Access-Control-Allow-Headers': 'Content-Type,Authorization',
                            'Access-Control-Allow-Methods': 'POST,OPTIONS'
                        },
                        body: JSON.stringify({
                            error: 'Error interno del servidor',
                            message: error_2.message,
                            details: process.env.NODE_ENV === 'development' ? error_2.stack : undefined
                        })
                    }];
            case 5: return [2 /*return*/];
        }
    });
}); };
//# sourceMappingURL=generatePDF.js.map