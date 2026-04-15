/* CreamViz 量化决策系统 - 核心逻辑 */
const $=id=>document.getElementById(id);
const fmt=n=>n==null?'--':n.toLocaleString('zh-CN');
const fmtPct=n=>n==null?'--':(n>=0?'+':'')+n.toFixed(2)+'%';
const fmtM=n=>n==null?'--':(n>=0?'+':'')+'¥'+Math.abs(n).toLocaleString('zh-CN',{maximumFractionDigits:0});
function toast(m,t=''){const e=$('toast');e.textContent=m;e.className='toast show '+(t||'');setTimeout(()=>e.className='toast',2500)}

function switchView(v){document.querySelectorAll('.view').forEach(e=>e.classList.remove('active'));document.querySelectorAll('.nav-tab').forEach(e=>e.classList.remove('active'));$('view-'+v).classList.add('active');event.target.classList.add('active');setTimeout(()=>window.dispatchEvent(new Event('resize')),100)}

const S={market_temperature:null,red_flags:{},portfolio:{kpi:{},stocks:[],sector_distribution:{}},valuation:{stocks:{},floor_top10:[],ceiling_top10:[]},chain_heat:{},trade_log:[],thresholds:{},portfolio_config:{portfolio:[],watchlist:[]},expectation:{stocks:[],beat_rank:[],miss_rank:[]},catalysts:[]};

async function loadAll(){
  const b=location.href.substring(0,location.href.lastIndexOf('/')+1);
  try{const r=await fetch(b+'data/data_cache.json');if(!r.ok)throw 0;const d=await r.json();Object.assign(S,{market_temperature:d.market_temperature,red_flags:d.red_flags||{},portfolio:d.portfolio||{kpi:{},stocks:[],sector_distribution:{}},valuation:d.valuation||{stocks:{},floor_top10:[],ceiling_top10:[]},chain_heat:d.chain_heat||{},expectation:d.expectation||{stocks:[],beat_rank:[],miss_rank:[]},catalysts:d.catalysts||[]});$('updateTime').textContent='更新: '+(d.last_update||d.data_date||'');toast('数据加载成功','success')}catch(e){console.warn('Demo',e);loadDemo();toast('演示数据','error')}
  try{const p=await(await fetch(b+'config/portfolio.json')).json();S.portfolio_config=p;$('cfgPortfolio').value=JSON.stringify(p,null,2)}catch(e){}
  renderAll()}

function loadDemo(){
  S.market_temperature={temperature:42,level:'中性',emoji:'🟡',color:'#F1C40F',advice:'今日温度 42 ℃，市场中性，可看可动',scores:{limit_ratio:55,northbound:48,deviation:35,advance_decline:52,style:40},components:{limit_ratio:{raw:{zt:45,dt:35}},northbound_flow_5d:{value:12.5}}};
  S.portfolio={kpi:{total_market_value:186820,total_cost:197750,total_pnl:-10930,total_pnl_pct:-5.53,today_pnl:-1535,today_pnl_pct:-0.82,max_drawdown:-12.3,max_concentration:38.5,stock_count:5},stocks:[
    {code:'600519',name:'贵州茅台',sector:'白酒',shares:10,cost_price:1680,current_price:1568,today_pct:-1.2,market_value:15680,cost_value:16800,total_pnl:-1120,total_pnl_pct:-6.67,today_pnl:-188,hold_days:304},
    {code:'300750',name:'宁德时代',sector:'新能源',shares:100,cost_price:185.5,current_price:172.3,today_pct:-2.1,market_value:17230,cost_value:18550,total_pnl:-1320,total_pnl_pct:-7.12,today_pnl:-362,hold_days:238},
    {code:'601318',name:'中国平安',sector:'保险',shares:500,cost_price:42.8,current_price:48.5,today_pct:1.5,market_value:24250,cost_value:21400,total_pnl:2850,total_pnl_pct:13.32,today_pnl:361,hold_days:217},
    {code:'000858',name:'五粮液',sector:'白酒',shares:200,cost_price:145.2,current_price:138.6,today_pct:-0.8,market_value:27720,cost_value:29040,total_pnl:-1320,total_pnl_pct:-4.55,today_pnl:-224,hold_days:192},
    {code:'002594',name:'比亚迪',sector:'新能源汽车',shares:50,cost_price:228,current_price:198.4,today_pct:-1.5,market_value:9920,cost_value:11400,total_pnl:-1480,total_pnl_pct:-13.0,today_pnl:-150,hold_days:151}],sector_distribution:{'白酒':43400,'新能源':27150,'保险':24250,'新能源汽车':9920}};
  S.red_flags={'600519':{name:'贵州茅台',flags:[],score:0,high_count:0,mid_count:0,action:'安全'},'300750':{name:'宁德时代',flags:[{code:'R03',name:'现金流背离',severity:'high',detail:'OCF/净利润<50%×2季'}],score:3,high_count:1,mid_count:0,action:'密切观察'},'601318':{name:'中国平安',flags:[],score:0,high_count:0,mid_count:0,action:'安全'},'000858':{name:'五粮液',flags:[],score:0,high_count:0,mid_count:0,action:'安全'},'002594':{name:'比亚迪',flags:[{code:'R06',name:'大股东高质押',severity:'high',detail:'质押78%'},{code:'R04',name:'存货异常',severity:'mid',detail:'存货>营收×2'},{code:'R09',name:'毛利率下滑',severity:'mid',detail:'降5.2%×2季'}],score:5,high_count:1,mid_count:2,action:'密切观察'}};
  S.valuation={stocks:{'600519':{name:'贵州茅台',pe:22.5,pb:9.8,pe_percentile:35,pe_label:'⚪ 中性'},'300750':{name:'宁德时代',pe:18.2,pb:4.1,pe_percentile:12,pe_label:'🔵 偏低'},'601318':{name:'中国平安',pe:8.5,pb:1.1,pe_percentile:8,pe_label:'❄️ 地板'},'000858':{name:'五粮液',pe:19.8,pb:5.6,pe_percentile:28,pe_label:'🔵 偏低'},'002594':{name:'比亚迪',pe:25.1,pb:4.8,pe_percentile:42,pe_label:'⚪ 中性'},'600036':{name:'招商银行',pe:6.2,pb:0.9,pe_percentile:5,pe_label:'❄️ 地板'},'000333':{name:'美的集团',pe:14.5,pb:3.8,pe_percentile:22,pe_label:'🔵 偏低'},'601012':{name:'隆基绿能',pe:15.8,pb:2.1,pe_percentile:18,pe_label:'🔵 偏低'},'300059':{name:'东方财富',pe:32.1,pb:5.2,pe_percentile:55,pe_label:'⚪ 中性'},'002475':{name:'立讯精密',pe:28.5,pb:5.0,pe_percentile:48,pe_label:'⚪ 中性'},'600900':{name:'长江电力',pe:22.0,pb:4.5,pe_percentile:62,pe_label:'⚪ 中性'},'603259':{name:'药明康德',pe:18.9,pb:3.2,pe_percentile:15,pe_label:'🔵 偏低'},'002714':{name:'牧原股份',pe:12.3,pb:2.8,pe_percentile:20,pe_label:'🔵 偏低'},'601899':{name:'紫金矿业',pe:16.7,pb:4.2,pe_percentile:38,pe_label:'⚪ 中性'},'600809':{name:'山西汾酒',pe:35.2,pb:11.5,pe_percentile:68,pe_label:'⚪ 中性'}},floor_top10:[{code:'600036',name:'招商银行',pe_pct:5},{code:'601318',name:'中国平安',pe_pct:8},{code:'300750',name:'宁德时代',pe_pct:12},{code:'603259',name:'药明康德',pe_pct:15},{code:'601012',name:'隆基绿能',pe_pct:18},{code:'002714',name:'牧原股份',pe_pct:20},{code:'000333',name:'美的集团',pe_pct:22},{code:'000858',name:'五粮液',pe_pct:28},{code:'002475',name:'立讯精密',pe_pct:35},{code:'600519',name:'贵州茅台',pe_pct:38}],ceiling_top10:[{code:'600809',name:'山西汾酒',pe_pct:68},{code:'300059',name:'东方财富',pe_pct:55},{code:'002475',name:'立讯精密',pe_pct:48},{code:'002594',name:'比亚迪',pe_pct:42},{code:'601899',name:'紫金矿业',pe_pct:38},{code:'600519',name:'贵州茅台',pe_pct:35},{code:'600900',name:'长江电力',pe_pct:62},{code:'000333',name:'美的集团',pe_pct:22},{code:'601318',name:'中国平安',pe_pct:8},{code:'600036',name:'招商银行',pe_pct:5}]};
  S.chain_heat={'新能源汽车产业链':{stage:'主升',emoji:'🚀',avg_5d:3.2,avg_20d:18.5,avg_60d:25.3,zt_count:3,stock_count:15,representative_stocks:['宁德时代','比亚迪']},'光伏产业链':{stage:'退潮',emoji:'📉',avg_5d:-1.8,avg_20d:-8.2,avg_60d:-15.6,zt_count:0,stock_count:10,representative_stocks:['隆基绿能']},'半导体产业链':{stage:'萌芽',emoji:'🌱',avg_5d:1.5,avg_20d:6.8,avg_60d:5.2,zt_count:2,stock_count:12,representative_stocks:['立讯精密']},'白酒产业链':{stage:'沉睡',emoji:'💤',avg_5d:0.2,avg_20d:1.5,avg_60d:3.8,zt_count:0,stock_count:8,representative_stocks:['贵州茅台','五粮液']},'医药产业链':{stage:'高位震荡',emoji:'🏔️',avg_5d:-0.3,avg_20d:2.1,avg_60d:32.5,zt_count:1,stock_count:10,representative_stocks:['药明康德']}};
  $('updateTime').textContent='演示数据 · '+new Date().toLocaleDateString('zh-CN')}

function renderAll(){renderL0();renderL2KPI();renderL2Table();renderL2Charts();renderL1();renderL3();renderL3B();renderL3C();renderL4()}

function renderL0(){
  const d=S.market_temperature;if(!d)return;
  $('tempValue').textContent=d.temperature+' ℃';$('tempValue').style.color=d.color||'var(--t1)';
  $('tempLevel').textContent=(d.emoji||'')+' '+d.level;$('tempLevel').style.color=d.color||'var(--t1)';
  $('tempAdvice').textContent=d.advice;$('tempNeedle').style.left=Math.min(100,Math.max(0,d.temperature))+'%';
  // 使用 indicator_details（6维真实数据）
  const details=d.indicator_details||[];
  const vals=details.map(v=>({name:v.name,value:v.value,raw:v.raw||'',weight:v.weight||''}));
  if(!vals.length){
    const sc=d.scores||{};const names={limit_ratio:'涨跌停比',northbound:'北向资金',deviation:'指数偏离',advance_decline:'涨跌家数',style:'风格离散'};
    vals.push(...Object.keys(names).map(k=>({name:names[k],value:sc[k]||50,raw:'',weight:''})));
  }
  // 6维雷达图
  echarts.init($('tempCompChart')).setOption({radar:{indicator:vals.map(v=>({name:v.name,max:100})),shape:'circle',splitNumber:4,axisName:{color:'#7A7A7A',fontSize:11},splitLine:{lineStyle:{color:'#E8E3DB'}},splitArea:{areaStyle:{color:['rgba(232,180,184,0.05)','rgba(184,212,227,0.05)']}}},series:[{type:'radar',data:[{value:vals.map(v=>v.value),name:'得分',areaStyle:{color:'rgba(232,180,184,0.3)'},lineStyle:{color:'#E8B4B8',width:2},itemStyle:{color:'#E8B4B8'}}]}]});
  // 柱状图带原始数值tooltip
  echarts.init($('indicatorDetailChart')).setOption({grid:{left:'3%',right:'4%',bottom:'3%',top:'8%',containLabel:true},xAxis:{type:'category',data:vals.map(v=>v.name),axisLine:{lineStyle:{color:'#D8D3CB'}},axisLabel:{color:'#7A7A7A',fontSize:10,rotate:15}},yAxis:{type:'value',max:100,splitLine:{lineStyle:{color:'#E8E3DB',type:'dashed'}},axisLabel:{color:'#9A9A9A'}},series:[{type:'bar',barWidth:'50%',data:vals.map(v=>({value:v.value,itemStyle:{color:v.value>60?'#E8B4B8':v.value<40?'#B8D4E3':'#F0D4A8',borderRadius:[6,6,0,0]}})),label:{show:true,position:'top',formatter:p=>{const v=vals[p.dataIndex];return v.raw||''},fontSize:9,color:'#9A9A9A'},tooltip:{formatter:p=>{const v=vals[p.dataIndex];return `${v.name}<br/>得分: ${v.value}<br/>原始: ${v.raw}<br/>权重: ${v.weight}`}}}]})}

function renderL2KPI(){
  const k=S.portfolio.kpi;if(!k.total_market_value)return;
  const cs=[{icon:'💰',bg:'var(--a1)',label:'总市值',value:'¥'+fmt(k.total_market_value),change:null},{icon:'📊',bg:'var(--a2)',label:'总盈亏',value:fmtM(k.total_pnl),change:fmtPct(k.total_pnl_pct),cls:k.total_pnl>=0?'up':'down'},{icon:'📈',bg:'var(--a3)',label:'今日盈亏',value:fmtM(k.today_pnl),change:fmtPct(k.today_pnl_pct),cls:k.today_pnl>=0?'up':'down'},{icon:'⚠️',bg:'var(--a5)',label:'最大回撤',value:fmtPct(k.max_drawdown),change:null,cls:'down'},{icon:'🎯',bg:'var(--a4)',label:'持仓集中度',value:k.max_concentration+'%',change:k.max_concentration>40?'偏高':'合理',cls:k.max_concentration>40?'down':'up'}];
  $('portfolioKPI').innerHTML=cs.map(c=>`<div class="kpi-card"><div class="kpi-icon" style="background:${c.bg}">${c.icon}</div><div class="kpi-content"><div class="kpi-label">${c.label}</div><div class="kpi-value">${c.value}</div>${c.change?'<div class="kpi-change '+c.cls+'">'+c.change+'</div>':''}</div></div>`).join('')}

function getSignal(s){const rf=S.red_flags[s.code]||{score:0,flags:[]};const vl=S.valuation.stocks[s.code]||{pe_percentile:50,pe_label:'⚪ 中性'};const rp=S.riskPreset||{sellTh:6,reduceTh:3,addPeTh:30,addDropTh:-3};
  if(rf.score>=rp.sellTh)return{sg:'sell',st:'卖出',order:0};if(rf.score>=rp.reduceTh||vl.pe_percentile>90)return{sg:'reduce',st:'减仓',order:1};if(rf.score===0&&vl.pe_percentile<rp.addPeTh&&s.today_pct<rp.addDropTh)return{sg:'add',st:'加仓',order:2};return{sg:'hold',st:'持有',order:3}}
function renderL2Table(){
  const ss=[...S.portfolio.stocks];if(!ss.length)return;const tot=S.portfolio.kpi.total_market_value;
  ss.sort((a,b)=>getSignal(a).order-getSignal(b).order);
  $('pbody').innerHTML=ss.map(s=>{const rf=S.red_flags[s.code]||{score:0,flags:[]};const vl=S.valuation.stocks[s.code]||{pe_percentile:50,pe_label:'⚪ 中性'};
  const sig=getSignal(s);const sg=sig.sg,st=sig.st;
  const pct=(s.market_value/tot*100).toFixed(1);
  const vp=vl.pe_percentile;const vt=vp<=10?'vt-floor':vp<=30?'vt-low':vp<=70?'vt-mid':vp<=90?'vt-high':'vt-ceiling';
  return`<tr><td><span class="sig-dot sig-${sg}"></span>${st}</td><td><b>${s.name}</b><br><span style="color:var(--t3);font-size:11px">${s.code}</span></td><td>${s.sector}</td><td>${s.shares}</td><td>¥${s.cost_price}</td><td><b>¥${s.current_price}</b></td><td style="color:${s.today_pct>=0?'var(--red)':'var(--blue)'};font-weight:600">${fmtPct(s.today_pct)}</td><td>¥${fmt(s.market_value)}</td><td>${pct>30?'<span class="wb">'+pct+'%</span>':pct+'%'}</td><td style="color:${s.total_pnl>=0?'var(--red)':'var(--blue)'};font-weight:600">${fmtM(s.total_pnl)}<br><span style="font-size:11px">${fmtPct(s.total_pnl_pct)}</span></td><td>${s.hold_days}天</td><td>${rf.score>0?'<span class="wb">⚠️ '+rf.score+'分</span>':'--'}</td><td><span class="vtag ${vt}">${vp.toFixed(0)}% ${vl.pe_label}</span></td></tr>`}).join('')}

function renderL2Charts(){
  const sd=S.portfolio.sector_distribution;const en=Object.entries(sd);const cols=['#E8B4B8','#B8D4E3','#F0D4A8','#D4C4E0','#F4B8A3','#C8E6D5','#B8D4C8','#F8E8D8'];
  if(en.length)echarts.init($('sectorChart')).setOption({series:[{type:'pie',radius:['35%','65%'],center:['40%','50%'],label:{show:true,position:'outside',formatter:'{b}\n{d}%',color:'#4A4A4A',fontSize:12,fontWeight:600},labelLine:{show:true,length:12,length2:8,lineStyle:{color:'#D8D3CB'}},data:en.map(([k,v],i)=>({name:k,value:v,itemStyle:{color:cols[i%cols.length]}})),emphasis:{itemStyle:{shadowBlur:10,shadowColor:'rgba(0,0,0,0.15)'}},itemStyle:{borderRadius:6,borderColor:'#fff',borderWidth:3}}]});
  const ss=S.portfolio.stocks;if(ss.length){const so=[...ss].sort((a,b)=>a.total_pnl-b.total_pnl);echarts.init($('contribChart')).setOption({grid:{left:'3%',right:'12%',bottom:'3%',top:'5%',containLabel:true},xAxis:{type:'value',splitLine:{lineStyle:{color:'#E8E3DB',type:'dashed'}},axisLabel:{color:'#9A9A9A',formatter:v=>(v>=0?'+':'')+v}},yAxis:{type:'category',data:so.map(s=>s.name),axisLine:{lineStyle:{color:'#D8D3CB'}},axisLabel:{color:'#4A4A4A',fontWeight:600}},series:[{type:'bar',barWidth:'55%',data:so.map(s=>({value:s.total_pnl,itemStyle:{color:s.total_pnl>=0?'#E8B4B8':'#B8D4E3',borderRadius:s.total_pnl>=0?[0,6,6,0]:[6,0,0,6]}})),label:{show:true,position:'right',formatter:p=>fmtM(p.value),color:'#4A4A4A',fontSize:11,fontWeight:600}}]})}}

function renderL1(){
  const g=$('flagGrid');const all=Object.values(S.red_flags);if(!all.length){g.innerHTML='<div style="color:var(--t3)">暂无数据</div>';return}
  const sr=[...all].sort((a,b)=>b.score-a.score);
  g.innerHTML=sr.map(f=>{const cl=f.score>=6?'high':f.score>=3?'mid':f.score>=1?'mid':'safe';const ac=f.score>=6?'act-sell':f.score>=3?'act-watch':f.score>=1?'act-notice':'act-safe';
  return`<div class="flag-card ${cl}"><div class="flag-header"><span class="flag-name">${f.name}</span><span class="flag-score" style="color:${f.score>=3?'var(--red)':'var(--t2)'}">${f.score}分</span></div><span class="flag-action ${ac}">${f.action}</span>${f.flags.length?'<div class="flag-list">'+f.flags.map(fl=>`<div class="flag-item"><span class="flag-dot ${fl.severity==='high'?'dot-h':'dot-m'}"></span>${fl.code} ${fl.name}: ${fl.detail}</div>`).join('')+'</div>':''}</div>`}).join('')}

let currentValDim='pe';
const VAL_DIMS={
  pe:{metric:'pe',pct:'pe_percentile',label:'pe_label',name:'PE',xName:'PE-TTM'},
  pb:{metric:'pb',pct:'pb_percentile',label:'pb_label',name:'PB',xName:'PB'},
  ps:{metric:'ps',pct:'ps_percentile',label:'ps_label',name:'PS',xName:'PS-TTM'},
  div:{metric:'dividend_yield',pct:'div_percentile',label:'div_label',name:'股息率',xName:'股息率%'}
};
function switchValDim(dim,btn){currentValDim=dim;document.querySelectorAll('.val-tab').forEach(e=>e.classList.remove('active'));btn.classList.add('active');renderL3()}
function renderL3(){
  const fl=S.valuation.floor_top10||[];$('floorList').innerHTML=fl.map((v,i)=>`<div class="vitem"><span class="vrank">${i+1}</span><div><div class="vname">${v.name}</div><div class="vcode">${v.code}</div></div><span class="vpct" style="color:var(--blue)">${v.pe_pct.toFixed(0)}%</span></div>`).join('');
  const cl=S.valuation.ceiling_top10||[];$('ceilingList').innerHTML=cl.map((v,i)=>`<div class="vitem"><span class="vrank">${i+1}</span><div><div class="vname">${v.name}</div><div class="vcode">${v.code}</div></div><span class="vpct" style="color:var(--red)">${v.pe_pct.toFixed(0)}%</span></div>`).join('');
  const vs=S.valuation.stocks;const pts=Object.entries(vs).map(([c,v])=>({code:c,...v}));
  const dm=VAL_DIMS[currentValDim];
  if(pts.length)echarts.init($('valScatter')).setOption({grid:{left:'3%',right:'4%',bottom:'3%',top:'8%',containLabel:true},xAxis:{type:'value',name:dm.xName,nameLocation:'center',nameGap:30,nameTextStyle:{color:'#7A7A7A'},splitLine:{lineStyle:{color:'#E8E3DB',type:'dashed'}},axisLabel:{color:'#9A9A9A'}},yAxis:{type:'value',name:dm.name+'分位%',nameLocation:'center',nameGap:40,nameTextStyle:{color:'#7A7A7A'},max:100,splitLine:{lineStyle:{color:'#E8E3DB',type:'dashed'}},axisLabel:{color:'#9A9A9A'}},series:[{type:'scatter',symbolSize:18,data:pts.filter(p=>p[dm.metric]!=null&&p[dm.metric]>0).map(p=>({value:[p[dm.metric],p[dm.pct]],name:p.code,itemStyle:{color:p[dm.pct]<=10?'#B8D4E3':p[dm.pct]<=30?'#B8D4C8':p[dm.pct]<=70?'#F0D4A8':p[dm.pct]<=90?'#F4B8A3':'#E8B4B8',borderColor:'#fff',borderWidth:2}})),label:{show:true,formatter:p=>p.name,position:'top',fontSize:10,color:'#7A7A7A'}}],tooltip:{formatter:p=>`${p.name}<br/>${dm.name}: ${p.value[0]}<br/>分位: ${p.value[1]}%`}})}

function renderL4(){
  const ch=S.chain_heat;const en=Object.entries(ch);if(!en.length)return;
  $('chainGrid').innerHTML=en.map(([n,d])=>`<div class="chain-card"><div class="chain-emoji">${d.emoji}</div><div class="chain-name">${n}</div><div class="chain-metrics"><div>阶段: <b>${d.stage}</b></div><div>5日: <b style="color:${d.avg_5d>=0?'var(--red)':'var(--blue)'}">${d.avg_5d}%</b></div><div>20日: <b>${d.avg_20d}%</b></div><div>60日: <b>${d.avg_60d}%</b></div><div>涨停: <b>${d.zt_count}</b>家</div><div>标的: <b>${d.stock_count}</b>只</div></div><div class="chain-stocks">代表: ${(d.representative_stocks||[]).join('、')}</div></div>`).join('');
  const so2={'萌芽':1,'主升':2,'高位震荡':3,'退潮':4,'沉睡':5};const sr=[...en].sort((a,b)=>(so2[a[1].stage]||5)-(so2[b[1].stage]||5));const sc={'萌芽':'#B8D4C8','主升':'#E8B4B8','高位震荡':'#F4B8A3','退潮':'#B8D4E3','沉睡':'#E8E3DB'};
  echarts.init($('chainChart')).setOption({grid:{left:'3%',right:'4%',bottom:'3%',top:'12%',containLabel:true},xAxis:{type:'category',data:sr.map(e=>e[0].replace('产业链','')),axisLine:{lineStyle:{color:'#D8D3CB'}},axisLabel:{color:'#4A4A4A',fontSize:11,rotate:15}},yAxis:[{type:'value',name:'20日涨幅%',nameTextStyle:{color:'#7A7A7A'},splitLine:{lineStyle:{color:'#E8E3DB',type:'dashed'}},axisLabel:{color:'#9A9A9A'}},{type:'value',name:'5日涨幅%',nameTextStyle:{color:'#7A7A7A'},splitLine:{show:false},axisLabel:{color:'#9A9A9A'}}],series:[{type:'bar',barWidth:'40%',yAxisIndex:0,name:'20日',data:sr.map(e=>({value:e[1].avg_20d,itemStyle:{color:sc[e[1].stage]||'#E8E3DB',borderRadius:[6,6,0,0]}})),label:{show:true,position:'top',formatter:p=>p.value+'%',fontSize:11,color:'#4A4A4A'}},{type:'bar',barWidth:'25%',yAxisIndex:1,name:'5日',data:sr.map(e=>({value:e[1].avg_5d,itemStyle:{color:(sc[e[1].stage]||'#E8E3DB')+'AA',borderRadius:[6,6,0,0]}}))}]});
  // Sankey图：产业链→阶段
  const sankeyData=[];const sankeyLinks=[];
  en.forEach(([n,d])=>{sankeyData.push({name:n.replace('产业链','')});if(!sankeyData.find(x=>x.name===d.stage))sankeyData.push({name:d.stage});sankeyLinks.push({source:n.replace('产业链',''),target:d.stage,value:d.stock_count})});
  echarts.init($('chainSankey')).setOption({series:[{type:'sankey',layout:'none',emphasis:{focus:'adjacency'},nodeAlign:'left',data:sankeyData,links:sankeyLinks,lineStyle:{color:'gradient',curveness:0.5},label:{color:'#4A4A4A',fontSize:12,fontWeight:600},itemStyle:{borderWidth:0}}]});
  // 利润环节热力图（上中下游毛利率）
  const hmData=[
    [0,0,35.2,'贵州茅台'],[0,1,75.1,'五粮液'],[0,2,68.5,'山西汾酒'],
    [1,0,22.5,'宁德时代'],[1,1,18.3,'比亚迪'],[1,2,15.2,'立讯精密'],
    [2,0,42.5,'中国平安'],[2,1,38.2,'招商银行'],[2,2,28.5,'长江电力'],
    [3,0,-18.5,'隆基绿能'],[3,1,25.8,'药明康德'],[3,2,12.3,'牧原股份'],
    [4,0,15.8,'东方财富'],[4,1,28.5,'美的集团'],[4,2,18.2,'紫金矿业']
  ];
  echarts.init($('profitHeatmap')).setOption({grid:{left:'10%',right:'12%',bottom:'12%',top:'5%'},xAxis:{type:'category',data:['上游','中游','下游'],splitArea:{show:true},axisLine:{lineStyle:{color:'#D8D3CB'}},axisLabel:{color:'#4A4A4A',fontWeight:600}},yAxis:{type:'category',data:['白酒链','新能源链','金融链','医药链','TMT链'],splitArea:{show:true},axisLine:{lineStyle:{color:'#D8D3CB'}},axisLabel:{color:'#4A4A4A',fontWeight:600}},visualMap:{min:-20,max:80,calculable:true,orient:'vertical',right:0,top:'center',inRange:{color:['#B8D4E3','#F8E8D8','#F0D4A8','#F4B8A3','#E8B4B8']},textStyle:{color:'#9A9A9A',fontSize:11},text:['高毛利','低毛利']},series:[{type:'heatmap',data:hmData,label:{show:true,formatter:p=>p.data[3]+'\n'+p.data[2]+'%',fontSize:10,color:'#4A4A4A',fontWeight:600},emphasis:{itemStyle:{shadowBlur:10,shadowColor:'rgba(0,0,0,0.2)'}}}]}
  )

function renderL3B(){
  const exp=S.expectation;
  // 超预期榜
  const beat=exp.beat_rank||[];
  $('beatRank').innerHTML=beat.length?beat.map((b,i)=>`<div class="vitem"><span class="vrank" style="color:var(--red)">${i+1}</span><div><div class="vname">${b.name}</div><div class="vcode">${b.code} · ${b.period}</div></div><span class="vpct" style="color:var(--red)">+${b.diff.toFixed(1)}%</span></div>`).join(''):'<div style="color:var(--t3);padding:20px;text-align:center">暂无数据</div>';
  // 打脸榜
  const miss=exp.miss_rank||[];
  $('missRank').innerHTML=miss.length?miss.map((b,i)=>`<div class="vitem"><span class="vrank" style="color:var(--blue)">${i+1}</span><div><div class="vname">${b.name}</div><div class="vcode">${b.code} · ${b.period}</div></div><span class="vpct" style="color:var(--blue)">${b.diff.toFixed(1)}%</span></div>`).join(''):'<div style="color:var(--t3);padding:20px;text-align:center">暂无数据</div>';
  // 预期增长率排行图
  const stocks=(exp.stocks||[]).sort((a,b)=>b.growth_rate-a.growth_rate);
  if(stocks.length)echarts.init($('expectChart')).setOption({grid:{left:'3%',right:'12%',bottom:'3%',top:'5%',containLabel:true},xAxis:{type:'value',splitLine:{lineStyle:{color:'#E8E3DB',type:'dashed'}},axisLabel:{color:'#9A9A9A',formatter:v=>v+'%'}},yAxis:{type:'category',data:stocks.map(s=>s.name),axisLine:{lineStyle:{color:'#D8D3CB'}},axisLabel:{color:'#4A4A4A',fontWeight:600}},series:[{type:'bar',barWidth:'55%',data:stocks.map(s=>({value:s.growth_rate,itemStyle:{color:s.growth_rate>=0?'#E8B4B8':'#B8D4E3',borderRadius:s.growth_rate>=0?[0,6,6,0]:[6,0,0,6]}})),label:{show:true,position:'right',formatter:p=>{const s2=stocks[p.dataIndex];return (s2.growth_rate>=0?'+':'')+s2.growth_rate.toFixed(1)+'%'},color:'#4A4A4A',fontSize:11,fontWeight:600}}],tooltip:{formatter:p=>{const s2=stocks[p.dataIndex];return `${s2.name}<br/>2025EPS: ${s2.eps_2025}<br/>2026EPS: ${s2.eps_2026}<br/>增长率: ${s2.growth_rate>=0?'+':''}${s2.growth_rate.toFixed(1)}%<br/>评级: ${s2.rating}<br/>分析师: ${s2.analyst_count}位`}}})}
}

function renderL3C(){
  const cats=S.catalysts||[];if(!cats.length){$('catalystList').innerHTML='<div style="color:var(--t3);padding:20px;text-align:center">暂无催化剂事件</div>';return}
  const typeColors={'财报':'var(--a1)','解禁':'var(--red)','分红':'var(--a6)'};
  const typeEmoji={'财报':'📋','解禁':'🔓','分红':'💰'};
  let html='';let lastDate='';
  cats.forEach(c=>{
    const dateStr=c.date.slice(5);
    if(dateStr!==lastDate){html+=`<div style="font-size:12px;font-weight:700;color:var(--t2);margin-top:12px;margin-bottom:6px;padding-left:4px;border-left:3px solid var(--bm)">${dateStr}</div>`;lastDate=dateStr}
    const bg=typeColors[c.type]||'var(--bg-t)';const emoji=typeEmoji[c.type]||'📌';
    html+=`<div style="display:flex;align-items:center;gap:10px;padding:6px 8px;border-radius:8px;background:var(--bg-p);margin-bottom:4px"><span style="font-size:16px">${emoji}</span><div style="flex:1"><span style="font-weight:600;font-size:13px">${c.name}</span><span style="color:var(--t3);font-size:11px;margin-left:6px">${c.code}</span></div><span style="font-size:11px;padding:2px 8px;border-radius:10px;background:${bg};color:#fff;font-weight:600">${c.type}</span><span style="font-size:12px;color:var(--t2)">${c.detail}</span></div>`;
  });
  $('catalystList').innerHTML=html
}

// ─── Export ───
async function exportPNG(){const el=document.querySelector('#view-dashboard');const c=await html2canvas(el,{backgroundColor:'#FDF8F0',scale:2});const a=document.createElement('a');a.download='creamviz_quant_'+new Date().toISOString().slice(0,10)+'.png';a.href=c.toDataURL();a.click();toast('截图已保存','success')}
function exportExcel(){const wb=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(S.portfolio.stocks.map(s=>({'股票':s.name,'代码':s.code,'行业':s.sector,'持股数':s.shares,'成本价':s.cost_price,'现价':s.current_price,'当日涨跌%':s.today_pct,'市值':s.market_value,'盈亏额':s.total_pnl,'盈亏%':s.total_pnl_pct,'持有天数':s.hold_days}))),'持仓明细');
  const vf=Object.entries(S.valuation.stocks).map(([c,v])=>({'代码':c,'名称':v.name,'PE':v.pe,'PB':v.pb,'PE分位%':v.pe_percentile,'估值标签':v.pe_label}));
  XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(vf),'估值数据');
  XLSX.writeFile(wb,'creamviz_quant_'+new Date().toISOString().slice(0,10)+'.xlsx');toast('Excel已导出','success')}

// ─── Console ───
function saveCfg(){try{const d=JSON.parse($('cfgPortfolio').value);localStorage.setItem('cv_portfolio',JSON.stringify(d));toast('配置已保存到本地','success')}catch(e){toast('JSON格式错误','error')}}
function setRisk(p){
  const presets={
    conservative:{sellTh:4,reduceTh:2,addPeTh:20,addDropTh:-2,label:'🛡️ 保守'},
    standard:{sellTh:6,reduceTh:3,addPeTh:30,addDropTh:-3,label:'⚖️ 标准'},
    aggressive:{sellTh:8,reduceTh:5,addPeTh:40,addDropTh:-5,label:'🔥 激进'}
  };
  const pr=presets[p];if(!pr)return;
  S.riskPreset=Object.assign(S.riskPreset||{},{...pr,preset:p});
  toast(pr.label+'模式已激活: 卖出≥'+pr.sellTh+'分 · 减仓≥'+pr.reduceTh+'分 · 加仓PE<'+pr.addPeTh+'%且跌幅>'+pr.addDropTh+'%','success');
  renderL2Table();renderL2KPI()
}

function analyzeTrades(){try{const logs=JSON.parse($('tradeLog').value);if(!logs.length){$('insight').textContent='暂无交易记录';return}
  const tags={};let wins=0,losses=0;const closed=[];const scatterData=[];
  logs.forEach(l=>{if(!l.tag)l.tag='其他';if(!tags[l.tag])tags[l.tag]={total:0,wins:0};tags[l.tag].total++;
    if(l.dir==='sell'&&l.price>(l.cost||0)){tags[l.tag].wins++;wins++}else if(l.dir==='sell')losses++;
    if(l.dir==='sell'){const ret=((l.price-(l.cost||0))/(l.cost||0)*100);closed.push({name:l.name,return_pct:ret,hold_days:l.hold_days||0,tag:l.tag});scatterData.push({value:[l.hold_days||0,ret],name:l.name,tag:l.tag})}
  });
  const rate=logs.length?((wins/(wins+losses))*100).toFixed(1):0;
  // 按动机胜率图（不变）
  const data=Object.entries(tags).map(([t,d])({name:t,value:d.total,wins:d.wins,rate:d.total?(d.wins/d.total*100).toFixed(1):0}));
  echarts.init($('tagChart')).setOption({grid:{left:'3%',right:'4%',bottom:'3%',top:'8%',containLabel:true},xAxis:{type:'category',data:data.map(d=>d.name),axisLine:{lineStyle:{color:'#D8D3CB'}},axisLabel:{color:'#4A4A4A'}},yAxis:{type:'value',splitLine:{lineStyle:{color:'#E8E3DB',type:'dashed'}},axisLabel:{color:'#9A9A9A'}},series:[{type:'bar',barWidth:'50%',data:data.map(d=>({value:d.value,itemStyle:{color:d.rate>=50?'#E8B4B8':'#B8D4E3',borderRadius:[6,6,0,0]}})),label:{show:true,position:'top',formatter:p=>{const d2=data[p.dataIndex];return d2.wins+'/'+d2.value+' ('+d2.rate+'%)'},color:'#4A4A4A',fontSize:11}}]});
  // 持有时长vs收益率散点图
  if(scatterData.length){echarts.init($('holdReturnChart')).setOption({grid:{left:'3%',right:'4%',bottom:'3%',top:'8%',containLabel:true},xAxis:{type:'value',name:'持有天数',nameTextStyle:{color:'#7A7A7A'},splitLine:{lineStyle:{color:'#E8E3DB',type:'dashed'}},axisLabel:{color:'#9A9A9A'}},yAxis:{type:'value',name:'收益率%',nameTextStyle:{color:'#7A7A7A'},splitLine:{lineStyle:{color:'#E8E3DB',type:'dashed'}},axisLabel:{color:'#9A9A9A',formatter:v=>v+'%'}},series:[{type:'scatter',symbolSize:20,data:scatterData.map(d=>({value:d.value,name:d.name,itemStyle:{color:d.value[1]>=0?'#E8B4B8':'#B8D4E3',borderColor:'#fff',borderWidth:2}})),label:{show:true,formatter:p=>p.name,position:'top',fontSize:10,color:'#7A7A7A'},markLine:{silent:true,lineStyle:{color:'#E8E3DB',type:'dashed'},data:[{yAxis:0}]}},{type:'scatter',symbolSize:12,data:scatterData.filter(d=>d.value[0]<5).map(d=>({value:d.value,name:d.name})),markArea:{silent:true,data:[[{coord:[0,-100],itemStyle:{color:'rgba(184,212,227,0.08)'}},{coord:[5,100]}]]}}],tooltip:{formatter:p=>`${p.name}<br/>持有: ${p.value[0]}天<br/>收益: ${p.value[1].toFixed(1)}%`}})}
  // 一句话洞察模板
  let insightLines=[];
  insightLines.push(`总交易 <b>${logs.length}</b> 笔 · 已平仓 <b>${closed.length}</b> 笔 · 胜率 <b>${rate}%</b>`);
  if(closed.length){const best=closed.reduce((a,b)=>a.return_pct>b.return_pct?a:b);const worst=closed.reduce((a,b)=>a.return_pct<b.return_pct?a:b);insightLines.push(`最佳: ${best.name} <b style="color:var(--red)">+${best.return_pct.toFixed(1)}%</b> 持有${best.hold_days}天 · 最差: ${worst.name} <b style="color:var(--blue)">${worst.return_pct.toFixed(1)}%</b> 持有${worst.hold_days}天`);
    const short=closed.filter(c=>c.hold_days<5);const long=closed.filter(c=>c.hold_days>30);
    if(short.length)insightLines.push(`⚡ 短线(<5天): ${short.length}笔, 平均收益 ${((short.reduce((s,c)=>s+c.return_pct,0)/short.length)).toFixed(1)}%`);
    if(long.length)insightLines.push(`🐢 中长线(>30天): ${long.length}笔, 平均收益 ${((long.reduce((s,c)=>s+c.return_pct,0)/long.length)).toFixed(1)}%`);
    // 按动机标签统计
    const tagInsight=Object.entries(tags).map(([t,d])=>`<b>${t}</b>: ${d.total}笔, 胜率${(d.wins/d.total*100).toFixed(0)}%`).join(' · ');
    insightLines.push(tagInsight)
  }
  $('insight').innerHTML=insightLines.join('<br>')
  }catch(e){toast('JSON格式错误','error')}}

// ─── Data Center ───
let currentDataTab='portfolio';
function switchDataTab(tab){currentDataTab=tab;document.querySelectorAll('.data-tab').forEach(e=>e.classList.remove('active'));event.target.classList.add('active');renderDataTable()}
function renderDataTable(){
  let headers=[],rows=[];
  if(currentDataTab==='portfolio'){headers=['代码','名称','行业','持股数','成本价'];rows=S.portfolio.stocks.map(s=>[s.code,s.name,s.sector,s.shares,s.cost_price])}
  else if(currentDataTab==='valuation'){headers=['代码','名称','PE','PB','PE分位%','标签'];rows=Object.entries(S.valuation.stocks).map(([c,v])=>[c,v.name,v.pe,v.pb,v.pe_percentile,v.pe_label])}
  else if(currentDataTab==='flags'){headers=['代码','名称','红旗数','高分','中分','建议'];rows=Object.entries(S.red_flags).map(([c,v])=>[c,v.name,v.score,v.high_count,v.mid_count,v.action])}
  else if(currentDataTab==='chains'){headers=['产业链','阶段','5日%','20日%','60日%','涨停数'];rows=Object.entries(S.chain_heat).map(([n,d])=>[n,d.stage,d.avg_5d,d.avg_20d,d.avg_60d,d.zt_count])}
  $('dthead').innerHTML='<tr>'+headers.map(h=>'<th>'+h+'</th>').join('')+'<th>操作</th></tr>';
  $('dtbody').innerHTML=rows.map((r,i)=>'<tr>'+r.map(v=>'<td>'+v+'</td>').join('')+'<td><button class="btn-del" onclick="this.closest(\'tr\').remove()">删除</button></td></tr>').join('')}
function addRow(){const r=document.createElement('tr');const cols=currentDataTab==='portfolio'?5:currentDataTab==='valuation'?6:currentDataTab==='flags'?6:6;
  r.innerHTML=Array(cols).fill(0).map(()=>'<td><input type="text"></td>').join('')+'<td><button class="btn-del" onclick="this.closest(\'tr\').remove()">删除</button></td>';
  $('dtbody').appendChild(r)}

// Init data center tabs
function initDataCenter(){
  const tabs=[{id:'portfolio',label:'持仓'},{id:'valuation',label:'估值'},{id:'flags',label:'红旗'},{id:'chains',label:'产业链'}];
  $('dataTabs').innerHTML=tabs.map((t,i)=>`<button class="data-tab ${i===0?'active':''}" onclick="switchDataTab('${t.id}')">${t.label}</button>`).join('');
  renderDataTable()}

// ─── INIT ───
window.addEventListener('DOMContentLoaded',()=>{loadAll().then(initDataCenter).catch(e=>{loadDemo();renderAll();initDataCenter()})});
window.addEventListener('resize',()=>{document.querySelectorAll('.chart-body').forEach(el=>{const c=echarts.getInstanceByDom(el);if(c)c.resize()})});
