'use client';

import { use } from 'react';
import NewProfileDetailView from '@/components/views/NewProfileDetailView';

export default function ProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  
  return <NewProfileDetailView profileId={id} />;
}
