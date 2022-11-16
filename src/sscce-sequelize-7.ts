import { DataTypes, Model, NonAttribute } from '@sequelize/core';
import { createSequelize7Instance } from '../setup/create-sequelize-instance';
import { expect } from 'chai';
import sinon from 'sinon';

// if your issue is dialect specific, remove the dialects you don't need to test on.
export const testingOnDialects = new Set(['mssql', 'sqlite', 'mysql', 'mariadb', 'postgres', 'postgres-native']);

// You can delete this file if you don't want your SSCCE to be tested against Sequelize 7

// Your SSCCE goes inside this function.
export async function run() {
  // This function should be used instead of `new Sequelize()`.
  // It applies the config for your SSCCE to work on CI.
  const sequelize = createSequelize7Instance({
    logQueryParameters: true,
    benchmark: true,
    define: {
      // For less clutter in the SSCCE
      timestamps: false,
    },
  });

  class Foo extends Model {
    declare id: number;
    declare name: string;
    declare note: string;
    declare setNote: NonAttribute<string>;
  }

  Foo.init({
    name: DataTypes.TEXT,
    note: {
      type: DataTypes.TEXT,
      defaultValue: '',
    },
    setNote: {
      type: new DataTypes.VIRTUAL(DataTypes.STRING, ['name']),
      set (this: Foo, value) {
        const name = this.getDataValue('name');
        this.setDataValue('note', `${name}: ${value}`);
      }
    }
  }, {
    sequelize,
    modelName: 'Foo',
  });

  // You can use sinon and chai assertions directly in your SSCCE.
  const spy = sinon.spy();
  sequelize.afterBulkSync(() => spy());
  await sequelize.sync({ force: true });
  expect(spy).to.have.been.called;

  let foo: Foo | null = await Foo.create({ name: 'Name' });
  const id = foo.id;
  expect(foo.name).to.equal('Name'); // Works

  foo.setNote = 'Note';
  foo = await foo.save();
  expect(foo.note).to.equal('Name: Note'); // Works

  foo.name = 'Name2';
  foo.setNote = 'Note2';
  foo = await foo.save();
  expect(foo.note).to.equal('Name2: Note2'); // Works

  foo.setNote = 'Note3';
  foo.name = 'Name3';
  foo = await foo.save();
  expect(foo.note).to.equal('Name3: Note3'); // Doesn't work

  await Foo.update({
    name: 'Name4',
    setNote: 'Note4',
  }, { where: { id } });
  foo = await Foo.findByPk(id);
  expect(foo?.note).to.equal('Name4: Note4'); // Works

  await Foo.update({
    setNote: 'Note5',
  }, { where: { id } });
  foo = await Foo.findByPk(id);
  expect(foo?.note).to.equal('Name4: Note5'); // Doesn't work

  await Foo.update({
    setNote: 'Note6',
    name: 'Name6',
  }, { where: { id } });
  foo = await Foo.findByPk(id);
  expect(foo?.note).to.equal('Name6: Note6'); // Doesn't work
}
