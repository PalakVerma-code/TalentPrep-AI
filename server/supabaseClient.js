const { createClient } = require('@supabase/supabase-js')
const path = require('path')

require('dotenv').config({ path: path.join(__dirname, '.env') })

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY

if (!supabaseUrl || !supabaseKey) {
	throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY/SUPABASE_KEY in environment variables')
}

const supabase = createClient(supabaseUrl, supabaseKey)

module.exports = supabase
