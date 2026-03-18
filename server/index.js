const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '.env') })
const express = require('express')
const cors = require('cors')
const interviewRoutes = require('./routes/interview')

const app = express()
const PORT = 5000

app.use(cors())
app.use(express.json())

app.get('/', (req, res) => {
	res.send('Server running')
})

app.use('/api/interview', interviewRoutes)

app.listen(PORT, () => {
	console.log(`Server started on port ${PORT}`)
})
