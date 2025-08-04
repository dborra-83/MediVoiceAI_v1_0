# Tabla de consultas médicas
resource "aws_dynamodb_table" "consultations" {
  name           = "${var.project_name}-${var.environment}-consultations"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "consultation_id"
  range_key      = "doctor_id"

  attribute {
    name = "consultation_id"
    type = "S"
  }

  attribute {
    name = "doctor_id"
    type = "S"
  }

  attribute {
    name = "patient_id"
    type = "S"
  }

  attribute {
    name = "created_at"
    type = "S"
  }

  # Índice global secundario para búsquedas por paciente
  global_secondary_index {
    name            = "PatientIndex"
    hash_key        = "patient_id"
    range_key       = "created_at"
    projection_type = "ALL"
  }

  # Índice global secundario para búsquedas por fecha
  global_secondary_index {
    name            = "DateIndex"
    hash_key        = "doctor_id"
    range_key       = "created_at"
    projection_type = "ALL"
  }

  tags = {
    Name        = "${var.project_name}-${var.environment}-consultations"
    Environment = var.environment
    Project     = var.project_name
  }
}

# Tabla de prompts médicos configurables
resource "aws_dynamodb_table" "prompts" {
  name           = "${var.project_name}-${var.environment}-prompts"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "prompt_id"
  range_key      = "specialty"

  attribute {
    name = "prompt_id"
    type = "S"
  }

  attribute {
    name = "specialty"
    type = "S"
  }

  attribute {
    name = "is_active"
    type = "S"
  }

  # Índice global secundario para prompts activos
  global_secondary_index {
    name            = "ActivePromptsIndex"
    hash_key        = "is_active"
    range_key       = "specialty"
    projection_type = "ALL"
  }

  tags = {
    Name        = "${var.project_name}-${var.environment}-prompts"
    Environment = var.environment
    Project     = var.project_name
  }
}

# Tabla de perfiles de doctores
resource "aws_dynamodb_table" "doctors" {
  name           = "${var.project_name}-${var.environment}-doctors"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "doctor_id"

  attribute {
    name = "doctor_id"
    type = "S"
  }

  attribute {
    name = "email"
    type = "S"
  }

  attribute {
    name = "license_number"
    type = "S"
  }

  # Índice global secundario para búsquedas por email
  global_secondary_index {
    name            = "EmailIndex"
    hash_key        = "email"
    projection_type = "ALL"
  }

  # Índice global secundario para búsquedas por licencia
  global_secondary_index {
    name            = "LicenseIndex"
    hash_key        = "license_number"
    projection_type = "ALL"
  }

  tags = {
    Name        = "${var.project_name}-${var.environment}-doctors"
    Environment = var.environment
    Project     = var.project_name
  }
}

# Tabla de información de pacientes
resource "aws_dynamodb_table" "patients" {
  name           = "${var.project_name}-${var.environment}-patients"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "patient_id"

  attribute {
    name = "patient_id"
    type = "S"
  }

  attribute {
    name = "patient_name"
    type = "S"
  }

  attribute {
    name = "created_at"
    type = "S"
  }

  # Índice global secundario para búsquedas por nombre
  global_secondary_index {
    name            = "PatientNameIndex"
    hash_key        = "patient_name"
    range_key       = "created_at"
    projection_type = "ALL"
  }

  tags = {
    Name        = "${var.project_name}-${var.environment}-patients"
    Environment = var.environment
    Project     = var.project_name
  }
}

# Nota: Los datos iniciales para prompts y doctores se pueden añadir
# después del deploy usando scripts o la consola de AWS
# Esto evita problemas de formato en Terraform 