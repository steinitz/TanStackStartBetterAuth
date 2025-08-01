// Test script to verify admin access for user 'c'
import { auth } from './stzUser/lib/auth.ts'

async function testAdminAccess() {
  try {
    // Test if user 'c' can list users using the admin role
    const result = await auth.api.listUsers({
      body: {},
      headers: {
        // This would normally come from session/cookie in real app
        'user-id': 'CSJvOAD7UJodMWaQu8dwk6k2XnsmYqJ0'
      }
    })
    
    console.log('✅ User c can access listUsers with admin role:')
    console.log('Number of users:', result?.length || 0)
    
  } catch (error) {
    console.log('❌ User c cannot access listUsers:')
    console.log('Error:', error.message)
  }
}

testAdminAccess()