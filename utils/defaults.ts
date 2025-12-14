import {Preferences} from "../types";

export const APP_NAME = process.env.APP_NAME || 'Rhizome';

export const DEFAULT_USER_PREFERENCES: Preferences = {
    theme: 'system',
    player: 'youtube',
    enableGraphCards: true,
    previewTrigger: 'modifier',
}

export const ADMIN_EMAIL = 'admin@rhizome.fyi';

export const ACCESS_CODES_EMAIL_SUBJECT = 'Rhizome Alpha Access Code for ';

export const ACCESS_CODES_EMAIL_PRE_CODE = `<html><head><title>Rhizome Alpha</title><meta charset="utf-8">
        <style>
          body { font-size: 16px; word-break: break-word; white-space: pre-wrap; }
        </style>
        </head><body><div dir="ltr"><p>Hey!</p><p>🙇‍♂️ <b>Thanks for signing up for Rhizome&#39;s alpha. </b>Rhizome is an interactive music discovery tool that helps you explore your collection and find new connections spatially through a dynamic force-graph visualization of genres, artists, and their relationships</p><p><strong>👀 What&#39;s in the alpha: </strong>Right now you can explore the full universe of genres (~2.5k) and artists (~180k) through the force graph, and start building your own collection by adding artists.</p><p>👋 <b>Quick heads up:</b> Alpha means rough edges, bugs, and things will change, so we&#39;re counting on your patience and feedback.</p><p><strong>💪 Help us shape it: </strong>Expect a cheeky notification at some point while using that app that links to a feedback form, but we want to hear all your unbridled feedback, so...</p><p></p><ol><li>Easiest way is through the app: More &gt;<b> Feedback and Requests. </b></li><li>Want to go deeper, let&#39;s have a quick chat: <strong><a href="https://cal.com/chonathon/15min" target="_blank">Book a feedback call</a>. </strong></li><li>Or reply to this email directly  :)</li></ol><div>btw, you if you dismiss the in-app notification, you can always access the form again through More &gt; Settings &gt; Support &gt; <b>Alpha Survey</b></div><p></p><p><b><br>🔑 Your alpha access code: </b>`

export const ACCESS_CODES_EMAIL_POST_CODE = `</p><p><strong><a href="https://rhizome.fyi/" target="_blank">Launch Rhizome →</a></strong></p><p><br>Excited to see what you discover!</p><p>Sean &amp; Ben</p></div>
</body></html>`;
export const ACCESS_CODES_EMAIL_PRE_CODE_HTML = `<div dir=3D"ltr"><p>Hey!</p><p>=F0=9F=99=87=E2=80=8D=E2=99=82=EF=B8=8F=C2=
=A0<b>Thanks for signing up for Rhizome&#39;s alpha.=C2=A0</b>Rhizome is an=
 interactive music discovery tool that helps you explore your collection an=
d find new connections spatially through a dynamic force-graph visualizatio=
n of genres, artists, and their relationships</p><p><strong>=F0=9F=91=80=C2=
=A0What&#39;s in the alpha:=C2=A0</strong>Right now you can explore the ful=
l universe of genres (~2.5k) and artists (~180k) through the force graph, a=
nd start building your own collection by adding artists.</p><p>=F0=9F=91=8B=
=C2=A0<b>Quick heads up:</b>=C2=A0Alpha means rough edges, bugs, and things=
 will change, so we&#39;re counting on your patience and feedback.</p><p><s=
trong>=F0=9F=92=AA=C2=A0Help us shape it: </strong>Expect a cheeky notifica=
tion at some point while using that app that links to a feedback form, but =
we want to hear all your unbridled feedback, so...</p><p></p><ol><li>Easies=
t way is=C2=A0through the app:=C2=A0More &gt;<b>=C2=A0Feedback and Requests=
.=C2=A0</b></li><li>Want to go deeper, let&#39;s have a quick chat:=C2=A0<s=
trong><a href=3D"https://cal.com/chonathon/15min" target=3D"_blank">Book a =
feedback call</a>.=C2=A0</strong></li><li>Or reply to this email directly=
=C2=A0 :)</li></ol><div>btw, you if you dismiss the in-app notification, yo=
u can always access the form again through More &gt; Settings &gt; Support =
&gt; <b>Alpha Survey</b></div><p></p><p><b><br>=F0=9F=94=91=C2=A0Your alpha=
 access code:=C2=A0</b>`;

export const ACCESS_CODES_EMAIL_POST_CODE_HTML = `</p><p><strong><a href=3D"https://rhizome=
.fyi/" target=3D"_blank">Launch Rhizome =E2=86=92</a></strong></p><p><br>Ex=
cited to see what you discover!</p><p>Sean &amp; Ben</p></div>
`;
