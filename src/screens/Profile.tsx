import { DEFAULT_THEME_ID, getTheme } from '../../shared/themes';
import { AccountActions, PronounPicker } from '../components/Account';
import { Identicon } from '../components/Identicon';
import { Block, Header } from '../components/ui';
import { navigate } from '../lib/router';
import { useTheme } from '../lib/theme';
import { useSession } from '../session';

/** "Mon profil": pronoun, code and sign-out, reachable from one's avatar anywhere. */
export function Profile() {
  const { session } = useSession();
  const theme = getTheme(DEFAULT_THEME_ID);
  useTheme(theme);
  const user = session?.user;
  if (!user) return null;
  return (
    <main className="screen">
      <Header title="Mon profil" sub="‹ Retour" onSubClick={() => history.length > 1 ? history.back() : navigate('/')} theme={theme} />
      <div className="pad">
        <Block color="cta" className="row shadow">
          <Identicon handle={user.handle} size={64} />
          <div>
            <div className="bigname small-name">{user.name}</div>
            <div className="small">@{user.handle}{user.isAdmin ? ' · 👑 admin' : ''}</div>
          </div>
        </Block>
        <PronounPicker />
        <p className="small">Ton avatar est créé à partir de ton @ : il est le même partout.</p>
        <AccountActions />
      </div>
    </main>
  );
}
