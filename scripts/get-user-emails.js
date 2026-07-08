// Script to get all user emails from Supabase
require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function getUserEmails() {
  try {
    // Get all profiles with emails
    const { data, error } = await supabase
      .from('profiles')
      .select('email, display_name, user_role, created_at')
      .order('created_at', { ascending: false })

    if (error) throw error

    console.log('\n=== BETA TESTER EMAILS ===\n')
    console.log(`Total users: ${data.length}\n`)
    
    // Display in a nice format
    data.forEach((user, index) => {
      console.log(`${index + 1}. ${user.email}`)
      console.log(`   Name: ${user.display_name}`)
      console.log(`   Role: ${user.user_role || 'Not set'}`)
      console.log(`   Signed up: ${new Date(user.created_at).toLocaleDateString()}`)
      console.log('')
    })

    // Also create a CSV export
    console.log('\n=== CSV FORMAT (copy/paste) ===\n')
    console.log('Email,Name,Role,Signup Date')
    data.forEach(user => {
      console.log(`${user.email},${user.display_name},${user.user_role || 'Not set'},${new Date(user.created_at).toLocaleDateString()}`)
    })

    // Email list only
    console.log('\n=== EMAIL LIST ONLY ===\n')
    console.log(data.map(u => u.email).join(', '))
    
  } catch (error) {
    console.error('Error fetching emails:', error)
  }
}

getUserEmails()
