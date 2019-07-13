const { PROP_TYPES } = require('./figma');

const mapTsType = type => {
  switch (type) {
    case PROP_TYPES.STRING:
      return 'string';
    case PROP_TYPES.NUMBER:
      return 'number';
    default:
      return 'any';
  }
};

const mapTsProp = ({ name, type }) =>
  `${name}: ${type.map(mapTsType).join(' | ')};`;

const ts = ({ name, props }) => `interface Props { ${props.map(mapTsProp).join(' ')} }
declare class ${name} extends Component<Props> {}
export default ${name};
`;

module.exports = { ts };