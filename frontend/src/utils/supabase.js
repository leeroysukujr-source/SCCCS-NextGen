import { createClient } from '@supabase/supabase-js'

// Supabase Configuration - Senior Cloud Architect Architecture
// Note: Project ID derived from backend S3 endpoint pdlnxbacrcqgghqfhnxy
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://YOUR_PROJECT_ID.supabase.co'
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

// Validation Check
if (supabaseUrl.includes('YOUR_PROJECT_ID') || !supabaseKey) {
    console.warn('⚠️ [Supabase] Project Configuration is incomplete. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.');
}

export const supabase = createClient(supabaseUrl, supabaseKey)

/**
 * Robust Supabase Storage Helper
 * Instruction: Transition from Multipart Upload to Direct Storage Upload.
 */
export const uploadToSupabase = async (file, type = 'workspace-logo', id = null) => {
    if (supabaseUrl.includes('YOUR_PROJECT_ID') || !supabaseKey) {
        throw new Error('Supabase project ID or Anon Key is missing. Please check your .env configuration.');
    }
    try {
        let bucket = ''
        let path = ''
        
        // Tiered Bucket Logic
        switch(type) {
            case 'workspace-logo':
                bucket = 'workspace-logos'
                path = `logo_ws_${id || 'default'}.png`
                break
            case 'system-logo':
                bucket = 'system-logos'
                path = 'system_logo.png'
                break
            case 'avatar':
                bucket = 'avatars'
                path = `avatar_${id || 'user'}.png`
                break
            default:
                throw new Error('Unknown upload type')
        }

        console.log(`🚀 [Supabase] Uploading to ${bucket}/${path}...`)

        // Step 1: Perform the Upload with Upsert (Overwrites existing file)
        const { data, error } = await supabase.storage
            .from(bucket)
            .upload(path, file, {
                cacheControl: '3600',
                upsert: true,
                contentType: file.type || 'image/png'
            })

        if (error) throw error

        // Step 2: Construct the Public URL
        // Instruction: We use the public URL format as buckets should be Publicly Readable.
        const { data: { publicUrl } } = supabase.storage
            .from(bucket)
            .getPublicUrl(path)

        // Append a cache-buster to ensure immediate UI sync
        const finalUrl = `${publicUrl}?t=${Date.now()}`
        
        console.log(`✅ [Supabase] Upload successful: ${finalUrl}`)
        return finalUrl

    } catch (err) {
        console.error(`❌ [Supabase] Upload failed:`, err)
        throw err
    }
}
