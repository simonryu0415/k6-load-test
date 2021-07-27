from datetime import datetime
import json
import matplotlib.pyplot as plt
import pandas as pd
'''Add test summary to data.json and update latency report'''
timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
# Read and overwrite test summary to data.json
with open("test_summary.json") as f_i, open("data.json", "r+") as f_o:
     data_o = json.load(f_o)
     # Filter custom trend metrics' 95th percentile request duration (Could be changed to include more data)
     data_i = {timestamp: {k: v["values"]["p(95)"] for k, v in json.load(f_i)["metrics"].items() if v["type"] == "trend" and k.startswith("custom")}}
     data_o.update(data_i)
     f_o.seek(0)
     json.dump(data_o, f_o, sort_keys=True, indent=4)

     print(json.dumps(data_o, indent=4))

     # Plot
     df = pd.DataFrame(data_o).T
     df.index = pd.to_datetime(df.index)

     api_list = ["zone", "crop"]
     plt.style.use('seaborn')
     fig, axs = plt.subplots(len(api_list), sharex=True)
     fig.suptitle('Load Testing Latency Visualization')

     for i,api in enumerate(api_list):
          df_api = df.filter(like=api).rename(columns=lambda x: x.split('-')[-1])
          axs[i].plot(df_api, marker="o")
          axs[i].legend(list(df_api), fontsize=6)
          axs[i].set_title(f"{api} APIs", fontsize=10)

     fig.text(0.04, 0.5, 'Latency (ms)', va='center', rotation='vertical')
     plt.xticks(fontsize=6,rotation=45)
     plt.savefig('latency_visualization.png', dpi=1000)




     
