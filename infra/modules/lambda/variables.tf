variable "environment" {
  description = "Ambiente de despliegue"
  type        = string
}

variable "project_name" {
  description = "Nombre del proyecto"
  type        = string
}

variable "audio_bucket_name" {
  description = "Nombre del bucket de audio"
  type        = string
}

variable "pdf_bucket_name" {
  description = "Nombre del bucket de PDFs"
  type        = string
}

variable "consultations_table" {
  description = "Nombre de la tabla de consultas"
  type        = string
}

variable "prompts_table" {
  description = "Nombre de la tabla de prompts"
  type        = string
}

variable "doctors_table" {
  description = "Nombre de la tabla de doctores"
  type        = string
} 