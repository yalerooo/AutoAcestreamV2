# AutoAcestream

AutoAcestream es una aplicación basada en Electron. A continuación, se detallan los pasos para configurar y ejecutar el proyecto en tu entorno local.

## Estructura del Proyecto

El proyecto utiliza Node.js y npm (o yarn) para gestionar las dependencias. El directorio `node_modules` contiene todas las bibliotecas necesarias para ejecutar el proyecto, pero no está incluido en el repositorio de Git debido a su gran tamaño. En su lugar, se utiliza un archivo `.gitignore` para excluirlo y se proporciona un archivo `package.json` para que los usuarios puedan instalar las dependencias fácilmente.

## Requisitos Previos

Antes de comenzar, asegúrate de tener instalado lo siguiente en tu sistema:

- **Node.js**: Versión 16.x o superior. Puedes descargarlo desde [aquí](https://nodejs.org/).
- **npm o yarn**: Estos gestores de paquetes vienen incluidos con Node.js o pueden instalarse por separado.
- **Git**: Para clonar el repositorio. Descárgalo desde [aquí](https://git-scm.com/).

## Configuración del Proyecto

### 1. Clonar el Repositorio

Clona este repositorio en tu máquina local utilizando el siguiente comando:

```bash
git clone https://github.com/yalerooo/AutoAcestreamV2.git
cd AutoAcestreamV2
```

### 2. Instalar Dependencias

El archivo `package.json` contiene una lista de todas las dependencias necesarias para el proyecto. Para instalarlas, ejecuta uno de los siguientes comandos:

#### Usando npm:
```bash
npm install
```

#### Usando yarn:
```bash
yarn install
```

Esto creará el directorio `node_modules` en tu proyecto, donde se almacenarán todas las bibliotecas necesarias, incluyendo Electron.

### 3. Ejecutar el Proyecto

Una vez instaladas las dependencias, puedes iniciar el proyecto con los siguientes comandos:

#### Usando npm:
```bash
npm start
```

#### Usando yarn:
```bash
yarn start
```

Esto iniciará la aplicación de Electron en tu entorno local.

