# Extensión PromoAdictos — Importador de 1 clic (v1.1)

Lee el enlace de afiliado `meli.la` del cuadro **"Generar link / ID de producto"** de la barra de
afiliados de Mercado Libre y lo manda al admin de promoadictos.com para auto-completar la oferta.

## Instalar o actualizar
1. Abre `chrome://extensions` y activa **Modo de desarrollador**.
2. Primera vez: **Cargar descomprimida** y elige esta carpeta. Si ya la tenías: reemplaza los archivos
   de la carpeta y pulsa **↻ (recargar)** en la tarjeta de la extensión.

## Uso
1. En un producto de Mercado Libre con la barra de afiliados, pulsa **Generar link** (se abre el cuadro).
2. Abre la extensión: debe decir **"Enlace de afiliado detectado"**.
3. **Importar a Admin** → se abre el panel con los datos; revisa, ajusta y publica.

Si el cuadro "Generar link" no está abierto, ofrece **"Importar sin afiliado"** (URL directa, sin tu
comisión). Solo lee la pestaña activa cuando tú abres la extensión (permisos `activeTab` + `scripting`).

## v1.2 — publicar directo
Con el enlace detectado hay dos botones:
- **Publicar directo**: el admin importa los datos y **guarda la oferta solo** si viene completa
  (título, precio, imagen) y con **descuento comprobable** (precio original mayor que el precio).
  Si falta algo, no se publica: te deja el formulario lleno y te dice qué falta. Si se publicó,
  aparece un aviso con **Ver en el sitio** y **Deshacer**.
- **Importar para revisar antes**: como en la v1.1 (tú confirmas y publicas).
Sin enlace de afiliado, la extensión nunca publica sola.
