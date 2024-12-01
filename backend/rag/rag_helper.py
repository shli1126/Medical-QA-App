import sys

def format_docs(docs):
    return "\n\n".join(doc.page_content for doc in docs)

def print_retrieved_docs(retrieved_docs, output_file):
    with open(output_file, 'w') as sys.stdout:
        print('\n #### Retrieved Documents #### \n')
        for i, doc in enumerate(retrieved_docs):
            print(f"Document {i+1}")
            print(f"Content: {doc.page_content}")
            print()
    
def get_basic_road_info(road_list):
    keep_ids = ["osm_ids", "name", "highway_type"]
    basic_road_info = {}
    for road in road_list:
        basic_road_info[road["id"]] = {key: road[key] for key in keep_ids}
        num_bike_lanes, num_lanes = 0, 0
        for lane in road["lane_specs_ltr"]:
            if lane["lt"] == "Biking":
                num_bike_lanes += 1
            elif lane["lt"] == "Driving":
                num_lanes += 1
        basic_road_info[road["id"]]["num_bike_lanes"] = num_bike_lanes
        basic_road_info[road["id"]]["num_lanes"] = num_lanes
    return basic_road_info
