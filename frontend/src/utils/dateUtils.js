import config from '../config'

/**
 * Utility functions for date formatting with timezone support
 * Supports Argentina, Chile, and Colombia timezones
 */

/**
 * Get the current timezone setting
 * @returns {string} Current timezone identifier
 */
export const getCurrentTimezone = () => {
  return config.timezone.getCurrent()
}

/**
 * Set the current timezone setting
 * @param {string} timezone - Timezone identifier
 */
export const setCurrentTimezone = (timezone) => {
  config.timezone.setCurrent(timezone)
}

/**
 * Get available timezones
 * @returns {Object} Available timezones configuration
 */
export const getAvailableTimezones = () => {
  return config.timezone.available
}

/**
 * Format date with timezone support
 * @param {string|Date} dateInput - Date to format
 * @param {Object} options - Formatting options
 * @returns {string} Formatted date string
 */
export const formatDateWithTimezone = (dateInput, options = {}) => {
  if (!dateInput) return 'Fecha no disponible'
  
  try {
    const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      console.warn('Invalid date provided:', dateInput)
      return 'Fecha inválida'
    }

    const timezone = options.timezone || getCurrentTimezone()
    
    const defaultOptions = {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false, // 24-hour format
      ...options.formatOptions
    }

    return new Intl.DateTimeFormat('es-ES', defaultOptions).format(date)
    
  } catch (error) {
    console.error('Error formatting date:', error, dateInput)
    return 'Error en fecha'
  }
}

/**
 * Format date for medical records (more detailed)
 * @param {string|Date} dateInput - Date to format
 * @param {Object} options - Additional options
 * @returns {string} Formatted date string for medical use
 */
export const formatMedicalDate = (dateInput, options = {}) => {
  const timezone = options.timezone || getCurrentTimezone()
  
  return formatDateWithTimezone(dateInput, {
    timezone,
    formatOptions: {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    }
  })
}

/**
 * Format date for listings (compact format)
 * @param {string|Date} dateInput - Date to format
 * @param {Object} options - Additional options
 * @returns {string} Compact formatted date string
 */
export const formatListDate = (dateInput, options = {}) => {
  const timezone = options.timezone || getCurrentTimezone()
  
  return formatDateWithTimezone(dateInput, {
    timezone,
    formatOptions: {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }
  })
}

/**
 * Format relative time (e.g., "hace 2 horas")
 * @param {string|Date} dateInput - Date to format
 * @param {Object} options - Additional options
 * @returns {string} Relative time string
 */
export const formatRelativeTime = (dateInput, options = {}) => {
  if (!dateInput) return 'Fecha no disponible'
  
  try {
    const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    
    // Convert to minutes, hours, days
    const diffMinutes = Math.floor(diffMs / (1000 * 60))
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    
    if (diffMinutes < 1) {
      return 'Ahora'
    } else if (diffMinutes < 60) {
      return `Hace ${diffMinutes} min${diffMinutes > 1 ? 'utos' : 'uto'}`
    } else if (diffHours < 24) {
      return `Hace ${diffHours} hora${diffHours > 1 ? 's' : ''}`
    } else if (diffDays < 30) {
      return `Hace ${diffDays} día${diffDays > 1 ? 's' : ''}`
    } else {
      // For older dates, show the actual date
      return formatListDate(dateInput, options)
    }
    
  } catch (error) {
    console.error('Error formatting relative time:', error)
    return formatListDate(dateInput, options) // Fallback to regular format
  }
}

/**
 * Get timezone display name
 * @param {string} timezone - Timezone identifier
 * @returns {string} Display name for timezone
 */
export const getTimezoneDisplayName = (timezone) => {
  const timezones = getAvailableTimezones()
  return timezones[timezone]?.displayName || timezone
}

/**
 * Get current date in specified timezone
 * @param {string} timezone - Timezone identifier
 * @returns {Date} Current date in timezone
 */
export const getCurrentDateInTimezone = (timezone = null) => {
  const tz = timezone || getCurrentTimezone()
  const now = new Date()
  
  // Get the timezone offset
  const formatter = new Intl.DateTimeFormat('en', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  })
  
  return now // Return current date (browser will handle display)
}

/**
 * Validate timezone
 * @param {string} timezone - Timezone to validate
 * @returns {boolean} Whether timezone is valid and supported
 */
export const isValidTimezone = (timezone) => {
  const availableTimezones = getAvailableTimezones()
  return timezone in availableTimezones
}

/**
 * Auto-detect user timezone (fallback to Argentina)
 * @returns {string} Detected or default timezone
 */
export const detectUserTimezone = () => {
  try {
    const detected = Intl.DateTimeFormat().resolvedOptions().timeZone
    
    // Map common timezones to our supported ones
    const timezoneMap = {
      'America/Argentina/Buenos_Aires': 'America/Argentina/Buenos_Aires',
      'America/Buenos_Aires': 'America/Argentina/Buenos_Aires',
      'America/Santiago': 'America/Santiago', 
      'America/Bogota': 'America/Bogota',
      'America/Colombia': 'America/Bogota'
    }
    
    return timezoneMap[detected] || config.timezone.default
    
  } catch (error) {
    console.warn('Could not detect timezone, using default:', error)
    return config.timezone.default
  }
}

// Export default object with all functions
const dateUtils = {
  getCurrentTimezone,
  setCurrentTimezone,
  getAvailableTimezones,
  formatDateWithTimezone,
  formatMedicalDate,
  formatListDate,
  formatRelativeTime,
  getTimezoneDisplayName,
  getCurrentDateInTimezone,
  isValidTimezone,
  detectUserTimezone
}

export default dateUtils