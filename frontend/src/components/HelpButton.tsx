import { IonFab, IonFabButton, IonIcon, useIonActionSheet, useIonToast } from '@ionic/react';
import { call } from 'ionicons/icons';
import { api, Contact } from '../services/api';

/** Floating Help button: one tap → choose family/doctor → phone call. */
export default function HelpButton() {
  const [present] = useIonActionSheet();
  const [toast] = useIonToast();

  const open = async () => {
    let contacts: Contact[] = [];
    try {
      contacts = await api<Contact[]>('/contacts');
    } catch { /* offline */ }
    if (!contacts.length) {
      toast({ message: 'Add family or doctor in Profile → Contacts first.', duration: 2500 });
      return;
    }
    present({
      header: 'Call for help',
      buttons: [
        ...contacts.map((c) => ({
          text: `${c.type === 'doctor' ? '🩺' : '👨‍👩‍👧'} ${c.name}${c.relation ? ` (${c.relation})` : ''}`,
          handler: () => { window.location.href = `tel:${c.phone}`; },
        })),
        { text: 'Cancel', role: 'cancel' },
      ],
    });
  };

  return (
    <IonFab vertical="bottom" horizontal="end" slot="fixed" className="help-fab">
      <IonFabButton onClick={open} aria-label="Call for help">
        <IonIcon icon={call} />
      </IonFabButton>
    </IonFab>
  );
}
