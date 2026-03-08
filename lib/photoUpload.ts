import { supabase } from '@/lib/supabase';

// Upload pojedynczego zdjęcia do Supabase Storage (bucket: profile-photos) i zwróć publiczny URL
// UWAGA: Plik trafia na Twój serwer Supabase, nie na zewnętrzny hosting!
export async function uploadProfilePhoto(file: File, userId: string): Promise<string | null> {
  const fileExt = file.name.split('.').pop();
  const filePath = `profiles/${userId}/${Date.now()}.${fileExt}`;
  // Wrzucenie pliku do bucketu 'profile-photos' (musisz utworzyć bucket w panelu Supabase)
  const { error: uploadError } = await supabase.storage.from('profile-photos').upload(filePath, file, {
    cacheControl: '3600',
    upsert: true,
  });
  if (uploadError) {
    console.error('Blad uploadu do storage:', uploadError);
    return null;
  }
  // Pobierz publiczny URL do pliku z Supabase Storage
  const { data } = supabase.storage.from('profile-photos').getPublicUrl(filePath);
  return data.publicUrl;
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
export async function addPhotoToProfilePhotos(userId: string, photoUrl: string, isMain = false, sortOrder = 0): Promise<boolean> {
  const { error } = await supabase.from('profile_photos').insert({
    profile_id: userId,
    url: photoUrl,
    is_main: isMain,
    sort_order: sortOrder,
  });

  if (error) {
    console.error('Blad zapisu do profile_photos:', error);
    return false;
  }

  return true;
}

// Usuń zdjęcie z profile_photos
export async function removePhotoFromProfilePhotos(photoId: string): Promise<boolean> {
  const { error } = await supabase.from('profile_photos').delete().eq('id', photoId);
  if (error) {
    console.error('Blad usuwania zdjecia:', error);
    return false;
  }
  return true;
}

// Ustaw zdjęcie główne
export async function setMainProfilePhoto(userId: string, photoId: string): Promise<boolean> {
  // Najpierw odznacz wszystkie
  const { error: resetError } = await supabase
    .from('profile_photos')
    .update({ is_main: false })
    .eq('profile_id', userId);

  if (resetError) {
    console.error('Blad resetowania glownego zdjecia:', resetError);
    return false;
  }

  // Potem ustaw wybrane
  const { error: mainError } = await supabase
    .from('profile_photos')
    .update({ is_main: true })
    .eq('id', photoId);

  if (mainError) {
    console.error('Blad ustawiania glownego zdjecia:', mainError);
    return false;
  }

  return true;
}
