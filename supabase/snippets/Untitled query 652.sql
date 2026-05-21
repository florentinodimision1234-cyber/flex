CREATE POLICY 'Un usuario autenticated solo puede leer su perfil'
ON public.perfiles
FOR select
using(perfiles.id - auth.uid ())



SET request.jwt.claims = '{"sub":"06c7cdc5-0806-43ae-977f-fd855f099949","role":"authenticated"}';
Select * from perfiles;


