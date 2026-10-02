import { useEffect, useState } from 'react';
import { saveProfile, uploadProfileImage } from '../services/profile.js';
import { useAction } from './data.js';

export function useProfileImage() {
  const [file,setFile] = useState(null), [preview,setPreview] = useState(''), [error,setError] = useState('');
  useEffect(() => {
    if (!file) { setPreview(''); return; }
    const url = URL.createObjectURL(file); setPreview(url);
    return () => URL.revokeObjectURL(url);
  },[file]);
  return {file,preview,error, clear() {setFile(null);setError('');}, select(event) {
    const selected = event.target.files?.[0]; event.target.value = ''; if (!selected) return;
    if (!['image/png','image/jpeg','image/webp'].includes(selected.type)) {setError('Elige una imagen JPG, PNG o WebP.');return;}
    if (!selected.size || selected.size > 10*1024*1024) {setError('Elige una imagen con contenido de hasta 10 MB.');return;}
    setError('');setFile(selected);
  }};
}
export function useProfileEditor(profile,user,onSession) {
  const [saved,setSaved] = useState(profile);
  const [info,setInfo] = useState({
    name:profile?.name ?? user.name ?? '',lastName:profile?.lastName ?? user.lastName ?? '',
    username:profile?.username || user.username, dateOfBirth:profile?.dateOfBirth || '',
    gender:profile?.gender || '',documentType:profile?.documentType || '',
    documentNumber:profile?.documentNumber || '',bio:profile?.bio || ''
  });
  const [contact,setContact] = useState({
    phone:profile?.phone || '',countryCode:profile?.countryCode || 'PE',
    department:profile?.department || '',province:profile?.province || '',district:profile?.district || '',ubigeoCode:profile?.ubigeoCode || ''
  });
  const avatar = useProfileImage(), banner = useProfileImage();
  const informationAction = useAction(), contactAction = useAction(), bannerAction = useAction();
  const busy = informationAction.busy || contactAction.busy || bannerAction.busy;
  return { saved,info,setInfo,contact,setContact,avatar,banner,busy,informationAction,contactAction,bannerAction,
    saveInformation: () => informationAction.run(async () => {
      const avatarFileId = avatar.file ? (await uploadProfileImage(avatar.file)).id : saved?.avatarFileId || null;
      const result = await saveProfile({...info,gender:info.gender || null,documentType:info.documentType || null,avatarFileId});
      setSaved(result);setInfo(current=>({...current,username:result.username}));avatar.clear();
      onSession?.({...user,username:result.username,name:result.name || '',lastName:result.lastName || ''});
    },'Información guardada.'),
    saveContact: () => contactAction.run(async () => {
      const result = await saveProfile({...contact,phone:contact.phone || null,
        countryCode:contact.countryCode || null,ubigeoCode:contact.ubigeoCode || null});
      setSaved(result);
    },'Contacto guardado.'),
    saveBanner: () => bannerAction.run(async () => {
      if (!banner.file) return;
      const bannerFileId = (await uploadProfileImage(banner.file)).id;
      const result = await saveProfile({bannerFileId});setSaved(result);banner.clear();
    },'Banner guardado.')
  };
}
