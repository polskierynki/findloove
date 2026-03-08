import { supabase } from '@/lib/supabase';

type PhotoMutationResult = {
  success: boolean;
  error?: string;
};

// Crop image na podstawie koordinat i konwertuj do File
export async function cropImage(
  imageSrc: string,
  crop: { x: number; y: number; width: number; height: number },
  zoom: number,
): Promise<{ file: File | null; error?: string }> {
  return new Promise((resolve) => {
    const image = new Image();
    image.src = imageSrc;
    
    image.onload = () => {
      const canvas = document.createElement('canvas');
      const maxSize = Math.max(image.width, image.height);
      const safeArea = 2 * ((maxSize / 2) * Math.sqrt(2));
      
      canvas.width = safeArea;
      canvas.height = safeArea;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve({ file: null, error: 'Failed to get canvas context' });
        return;
      }
      
      ctx.translate(safeArea / 2, safeArea / 2);
      ctx.translate(crop.x, crop.y);
      ctx.scale(zoom, zoom);
      ctx.translate(-image.width / 2, -image.height / 2);
      ctx.drawImage(image, 0, 0);
      
      canvas.toBlob((blob) => {
        if (!blob) {
          resolve({ file: null, error: 'Failed to create blob' });
          return;
        }
        
        const file = new File([blob], 'cropped.jpg', { type: 'image/jpeg' });
        resolve({ file });
      }, 'image/jpeg', 0.95);
    };
    
    image.onerror = () => {
      resolve({ file: null, error: 'Failed to load image' });
    };
  });
}

// Upload pojedynczego zdjęcia do Supabase Storage (bucket: profile-photos) i zwróć publiczny URL
// UWAGA: Plik trafia na Twój serwer Supabase, nie na zewnętrzny hosting!
export async function uploadProfilePhoto(
  file: File,
  userId: string,
): Promise<{ url: string | null; error?: string }> {
  const fileExt = file.name.split('.').pop();
  const filePath = `profiles/${userId}/${Date.now()}.${fileExt}`;
  // Wrzucenie pliku do bucketu 'profile-photos' (musisz utworzyć bucket w panelu Supabase)
  const { error: uploadError } = await supabase.storage.from('profile-photos').upload(filePath, file, {
    cacheControl: '3600',
    upsert: true,
  });
  if (uploadError) {
    console.error('=== BLAD UPLOADU DO STORAGE ===');
    console.error('Error object:', uploadError);
    console.error('Error message:', uploadError.message);
    console.table({ userId, filePath, fileSize: file.size, fileType: file.type });
    return {
      url: null,
      error: uploadError.message || 'Blad uploadu do storage.objects',
    };
  }
  // Pobierz publiczny URL do pliku z Supabase Storage
  const { data } = supabase.storage.from('profile-photos').getPublicUrl(filePath);
  return { url: data.publicUrl };
}

// Dodaj zdjęcie do photos[] w profiles (prosta galeria)
export async function addPhotoToProfile(userId: string, photoUrl: string) {
  // Pobierz aktualne photos[]
  const { data: profile } = await supabase.from('profiles').select('photos').eq('id', userId).single();
  const currentPhotos = profile?.photos || [];
  // Dodaj nowe zdjęcie
  const newPhotos = [...currentPhotos, photoUrl];
  await supabase.from('profiles').update({ photos: newPhotos }).eq('id', userId);
}

// Dodaj zdjęcie do profile_photos (pełna galeria)
export async function addPhotoToProfilePhotos(
  userId: string,
  photoUrl: string,
  isMain = false,
  sortOrder = 0,
): Promise<PhotoMutationResult> {
  const { error } = await supabase.from('profile_photos').insert({
    profile_id: userId,
    url: photoUrl,
    is_main: isMain,
    sort_order: sortOrder,
  });

  if (error) {
    console.error('=== BLAD ZAPISU DO profile_photos ===');
    console.error('Error object:', error);
    console.error('Error message:', error.message);
    console.error('Error details:', error.details);
    console.error('Error hint:', error.hint);
    console.error('Error code:', error.code);
    console.table({ userId, photoUrl, isMain, sortOrder });
    return {
      success: false,
      error: `${error.message}${error.details ? ' | Details: ' + error.details : ''}${error.hint ? ' | Hint: ' + error.hint : ''}`,
    };
  }

  return { success: true };
}

// Usuń zdjęcie z profile_photos
export async function removePhotoFromProfilePhotos(photoId: string): Promise<PhotoMutationResult> {
  const { error } = await supabase.from('profile_photos').delete().eq('id', photoId);
  if (error) {
    console.error('Blad usuwania zdjecia:', error);
    return {
      success: false,
      error: error.message || 'Blad usuwania zdjecia',
    };
  }
  return { success: true };
}

// Ustaw zdjęcie główne
export async function setMainProfilePhoto(userId: string, photoId: string): Promise<PhotoMutationResult> {
  // Najpierw odznacz wszystkie
  const { error: resetError } = await supabase
    .from('profile_photos')
    .update({ is_main: false })
    .eq('profile_id', userId);

  if (resetError) {
    console.error('Blad resetowania glownego zdjecia:', resetError);
    return {
      success: false,
      error: resetError.message || 'Blad resetowania glownego zdjecia',
    };
  }

  // Potem ustaw wybrane
  const { error: mainError } = await supabase
    .from('profile_photos')
    .update({ is_main: true })
    .eq('id', photoId);

  if (mainError) {
    console.error('Blad ustawiania glownego zdjecia:', mainError);
    return {
      success: false,
      error: mainError.message || 'Blad ustawiania glownego zdjecia',
    };
  }

  return { success: true };
}
