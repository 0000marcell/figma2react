# figma2react

## installation

```
  npm install -g figma2react
```

## create CRA application
```
  create-react-app test-figma2react
```
you can use any name

## create the configuration file in the root of the project
```
  cd test-figma2react
  touch .figma2react
```

## insert your configuration
```
  //.figma2react

  {
    "projectId": <id of your project>,
    "token": <your figma developer token>
  }
```

you can findout how to get your token [here](https://www.figma.com/developers/docs#auth)

if you wanna test it out just use the test project, projectId: "eYk3d4ngtHUXkg82atfuJP"

## generate your components

inside your CRA project

```
  figma2react generate
```

## watch for changes in the figma project and generate the components

```
  figma2react watch
```


###### Marcell Monteiro Cruz - 2018
