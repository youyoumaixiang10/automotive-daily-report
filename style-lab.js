const variants = {
  editorial: {
    name: '01 / 行业编辑部',
    note: '大留白与强标题，把每日信息做成一本值得翻阅的行业晨报。'
  },
  terminal: {
    name: '02 / 产品情报台',
    note: '把信息做成工作台：密度高、分类明确，适合上班前五分钟快速扫完。'
  },
  signal: {
    name: '03 / 市场信号',
    note: '用强烈的颜色、数字和图形捕捉变化，适合更关注策略与竞争节奏的人。'
  }
};
const preview = document.querySelector('#preview');
const note = document.querySelector('#selection-note');
document.querySelectorAll('.choice').forEach(button => button.addEventListener('click', () => {
  const style = button.dataset.style;
  preview.className = `site-preview ${style}`;
  document.querySelectorAll('.choice').forEach(item => item.classList.toggle('selected', item === button));
  note.innerHTML = `<span>${variants[style].name}</span><p>${variants[style].note}</p>`;
}));
