import {
  IonApp, IonIcon, IonLabel, IonRouterOutlet, IonTabBar, IonTabButton, IonTabs, setupIonicReact,
} from '@ionic/react';
import { IonReactRouter } from '@ionic/react-router';
import { addCircle, home, list, person, pulse } from 'ionicons/icons';
import { Redirect, Route } from 'react-router-dom';

import '@ionic/react/css/core.css';
import '@ionic/react/css/normalize.css';
import '@ionic/react/css/structure.css';
import '@ionic/react/css/typography.css';
import '@ionic/react/css/padding.css';
import '@ionic/react/css/flex-utils.css';
import './theme.css';

import { getToken } from './services/api';
import Login from './pages/Login';
import Home from './pages/Home';
import Episodes from './pages/Episodes';
import NewEpisode from './pages/NewEpisode';
import EpisodeDetail from './pages/EpisodeDetail';
import Timeline from './pages/Timeline';
import Profile from './pages/Profile';
import Contacts from './pages/Contacts';

// iOS look everywhere (nav bars, tab bar, swipe-back), even in a desktop browser.
setupIonicReact({ mode: 'ios' });

const Tabs = () => (
  <IonTabs>
    <IonRouterOutlet>
      <Route exact path="/home" component={Home} />
      <Route exact path="/episodes" component={Episodes} />
      <Route exact path="/episodes/:id" component={EpisodeDetail} />
      <Route exact path="/new" component={NewEpisode} />
      <Route exact path="/timeline" component={Timeline} />
      <Route exact path="/profile" component={Profile} />
      <Route exact path="/profile/contacts" component={Contacts} />
      <Route exact path="/" render={() => <Redirect to="/home" />} />
    </IonRouterOutlet>
    <IonTabBar slot="bottom">
      <IonTabButton tab="home" href="/home"><IonIcon icon={home} /><IonLabel>Home</IonLabel></IonTabButton>
      <IonTabButton tab="episodes" href="/episodes"><IonIcon icon={list} /><IonLabel>Episodes</IonLabel></IonTabButton>
      <IonTabButton tab="new" href="/new"><IonIcon icon={addCircle} /><IonLabel>Add</IonLabel></IonTabButton>
      <IonTabButton tab="timeline" href="/timeline"><IonIcon icon={pulse} /><IonLabel>Timeline</IonLabel></IonTabButton>
      <IonTabButton tab="profile" href="/profile"><IonIcon icon={person} /><IonLabel>Profile</IonLabel></IonTabButton>
    </IonTabBar>
  </IonTabs>
);

export default function App() {
  return (
    <IonApp>
      <IonReactRouter>
        <IonRouterOutlet>
          <Route exact path="/login" component={Login} />
          <Route render={() => (getToken() ? <Tabs /> : <Redirect to="/login" />)} />
        </IonRouterOutlet>
      </IonReactRouter>
    </IonApp>
  );
}
