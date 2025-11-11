import supabaseClient, { supabaseUrl } from "@/utils/supabase";

// Fetch Companies
export async function getCompanies(token) {
  const supabase = await supabaseClient(token);
  const { data, error } = await supabase.from("companies").select("*");

  if (error) {
    console.error("Error fetching Companies:", error);
    return null;
  }

  return data;
}

// Add Company
export async function addNewCompany(token, _, formData) {
  const supabase = await supabaseClient(token);

  try {
    // Log the token status
    console.log('Token present:', !!token);
    
    // Validate file
    if (!formData.logo) {
      throw new Error('No logo file provided');
    }

    const random = Math.floor(Math.random() * 90000);
    const fileName = `logo-${random}-${formData.name.replace(/\s+/g, '-')}`;

    console.log('Upload attempt details:', {
      fileName,
      fileType: formData.logo.type,
      fileSize: formData.logo.size,
      bucketName: 'company-logo'
    });

    // First try to upload the file
    const { data: uploadData, error: storageError } = await supabase.storage
      .from('company-logo')
      .upload(fileName, formData.logo, {
        cacheControl: '3600',
        contentType: formData.logo.type
      });

    if (storageError) {
      console.error('Storage Error Details:', {
        message: storageError.message,
        statusCode: storageError.statusCode,
        error: storageError
      });
      throw new Error(`Storage Error: ${storageError.message}`);
    }

    console.log('File uploaded successfully:', uploadData);

    // Construct the public URL
    const logo_url = `${supabaseUrl}/storage/v1/object/public/company-logo/${fileName}`;

    // Then create the company record
    const { data: insertedCompany, error: dbError } = await supabase
      .from('companies')
      .insert([
        {
          name: formData.name,
          logo_url: logo_url,
        },
      ])
      .select();

    if (dbError) {
      // If database insert fails, try to clean up the uploaded file
      await supabase.storage
        .from('company-logo')
        .remove([fileName]);
      
      console.error('Database Error:', dbError);
      throw new Error(`Database Error: ${dbError.message}`);
    }

    return insertedCompany;
  } catch (error) {
    console.error('Full error details:', error);
    throw error;
  }
}
