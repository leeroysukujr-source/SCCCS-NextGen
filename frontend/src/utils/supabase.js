import { createClient } from '@supabase/supabase-js'

// Supabase Configuration - Senior Cloud Architect Architecture
// Supabase Configuration - Senior Cloud Architect Architecture
// Note: Project ID updated to pfyyxvtuqiphktwslllw
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://pfyyxvtuqiphktwslllw.supabase.co'
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
    // Architectural Guard: Ensure Supabase is correctly initialized
    if (!supabaseUrl || supabaseUrl.includes('YOUR_PROJECT_ID') || !supabaseKey) {
        const errorMsg = '⚠️ [Supabase] Project ID or Anon Key is missing. Check VITE_SUPABASE_URL in .env.';
        console.error(errorMsg);
        throw new Error(errorMsg);
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

        console.log(`🚀 [Supabase] Preparing upload for ${bucket}/${path}...`)

        // DevOps Instruction 2: Re-verify Bucket Existence (Post-Restoration Safety)
        try {
            const { data: buckets, error: listError } = await supabase.storage.listBuckets();
            if (listError) throw listError;

            if (!buckets.find(b => b.name === bucket)) {
                console.info(`📦 [Supabase] Bucket '${bucket}' missing. Provisioning now...`);
                const { error: createError } = await supabase.storage.createBucket(bucket, { 
                    public: true,
                    fileSizeLimit: 5242880, // 5MB limit
                    allowedMimeTypes: ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/svg+xml']
                });
                if (createError) throw createError;
                console.log(`✅ [Supabase] Bucket '${bucket}' created successfully.`);
            }
        } catch (bucketErr) {
            console.warn(`⚠️ [Supabase] Bucket verification failed (Permissions?):`, bucketErr.message);
            // We continue anyway, as the bucket might exist but listBuckets is restricted
        }

        // Step 1: Perform the Upload with Upsert (Overwrites existing file)
        const { data, error } = await supabase.storage
            .from(bucket)
            .upload(path, file, {
                cacheControl: '3600',
                upsert: true,
                contentType: file.type || 'image/png'
            })

        if (error) {
            // Point 3: Handle StorageUnknownError (Network/URL mismatch)
            if (error.message?.includes('failed to fetch') || error.__type === 'StorageUnknownError') {
                throw new Error(`CONNECTION_ERROR: Could not reach Supabase at ${supabaseUrl}. Ensure the URL is correct.`);
            }
            throw error;
        }

        // Step 2: Construct the Public URL
        const { data: { publicUrl } } = supabase.storage
            .from(bucket)
            .getPublicUrl(path)

        // Append a cache-buster to ensure immediate UI sync
        const finalUrl = `${publicUrl}?t=${Date.now()}`
        
        console.log(`✅ [Supabase] Upload successful: ${finalUrl}`)
        return finalUrl

    } catch (err) {
        console.error(`❌ [Supabase] Operation failed:`, err)
        throw err
    }
}
