package finalproject;

import opennlp.tools.stemmer.PorterStemmer;
import opennlp.tools.stemmer.Stemmer;
import opennlp.tools.tokenize.SimpleTokenizer;

import java.io.BufferedReader;
import java.io.File;
import java.io.FileReader;
import java.io.IOException;
import java.io.Reader;
import java.io.Serializable;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import java.time.LocalDateTime;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.lang.Long;
import java.text.SimpleDateFormat;
import java.util.Calendar;

import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.apache.spark.api.java.AbstractJavaRDDLike;
import org.apache.spark.api.java.JavaPairRDD;
import org.apache.spark.api.java.JavaRDD;
import org.apache.spark.api.java.JavaRDDLike;
import org.apache.spark.api.java.JavaSparkContext;
import org.apache.spark.api.java.function.PairFunction;
import org.apache.spark.sql.Row;
import org.apache.spark.sql.RowFactory;
import org.apache.spark.sql.SparkSession;
import org.apache.spark.sql.catalyst.expressions.GenericRowWithSchema;
import org.apache.spark.sql.types.DataTypes;
import org.apache.spark.sql.types.StructType;

import com.amazonaws.services.dynamodbv2.document.BatchWriteItemOutcome;
import com.amazonaws.services.dynamodbv2.document.DynamoDB;
import com.amazonaws.services.dynamodbv2.document.Item;
import com.amazonaws.services.dynamodbv2.document.PrimaryKey;
import com.amazonaws.services.dynamodbv2.document.Table;
import com.amazonaws.services.dynamodbv2.document.TableWriteItems;
import com.amazonaws.services.dynamodbv2.model.AttributeDefinition;
import com.amazonaws.services.dynamodbv2.model.KeySchemaElement;
import com.amazonaws.services.dynamodbv2.model.KeyType;
import com.amazonaws.services.dynamodbv2.model.ProvisionedThroughput;
import com.amazonaws.services.dynamodbv2.model.ResourceInUseException;
import com.amazonaws.services.dynamodbv2.model.ScalarAttributeType;
import com.amazonaws.services.dynamodbv2.model.WriteRequest;
import com.amazonaws.services.dynamodbv2.document.DynamoDB;
import software.amazon.awssdk.services.dynamodb.model.DynamoDbException;

import com.google.gson.*;
import storage.DynamoConnector;
import storage.SparkConnector;
import scala.Tuple2;

public class TokenizeNews implements Serializable {
    static Logger logger = LogManager.getLogger(TokenizeNews.class);

    final static String tbName = "tokenizedNews";
	int row = 0;
	
	SimpleTokenizer model = SimpleTokenizer.INSTANCE;
	Stemmer stemmer = new PorterStemmer();
	DynamoDB db;

	
	/**
	 * Connection to Apache Spark
	 */
	SparkSession spark;
	JavaSparkContext context;
	TokenizeNews tokenizer;

     /**
	 * Initialize the database connection and open the file
	 * 
	 * @throws IOException
	 * @throws InterruptedException 
	 * @throws DynamoDbException 
	 */
	public void initialize() throws IOException, DynamoDbException, InterruptedException {
		logger.info("Connecting to DynamoDB...");
		db = DynamoConnector.getConnection("https://dynamodb.us-east-1.amazonaws.com");
		
		spark = SparkConnector.getSparkConnection();
		context = SparkConnector.getSparkContext();
		
		logger.debug("Connected!");
	}

    //

    List<Row> getNews(String filePath) throws IOException {
		
		BufferedReader reader = null;
		JsonParser mapper = new JsonParser();
		reader = new BufferedReader(new FileReader(new File(filePath)));

		String nextLine;
		List<JsonObject> lines = new ArrayList<>();

		while((nextLine = reader.readLine()) != null) {
			JsonObject news = mapper.parseString(nextLine).getAsJsonObject();
			lines.add(news);
		}

		final StructType schema = new StructType() // Make Schema for the TedTalks
						.add("category", "string")  
						.add("headline", "string") 
						.add("date", "string");

		List<Row> rowOfNews = lines.parallelStream()
						.map(line -> {
							Object[] row = new Object[3]; // assign appropriate values for each Schema
							String ct = line.get("category").toString();
							String hl = line.get("headline").toString();
							String dt = line.get("date").toString();
							row[0] = ct.substring(1, ct.length() - 1);
							row[1] = hl.substring(1, hl.length() - 1);
							row[2] = dt.substring(1, dt.length() - 1);
							//System.out.println(row[1]);
							return new GenericRowWithSchema(row, schema);// Make Row with Schema
						})
						.collect(Collectors.toList());
		return rowOfNews;
	}

    //
    public void uploadTokenized() throws IOException, DynamoDbException, InterruptedException {
	   
	   System.out.println("RUNNING");
       List<Row> newsData = this.getNews("NewsCategoryData.txt");
	   System.out.println("TOKENIZING");

       newsData.forEach(news -> { 
			String timeStamp = new SimpleDateFormat("yyyy-MM-dd").format(Calendar.getInstance().getTime());
			String tableName = this.tbName;
			System.out.println("ENTER");
			HashSet<Item> words = new HashSet<Item>(); 
			DynamoDB conn = DynamoConnector.getConnection("https://dynamodb.us-east-1.amazonaws.com");
			HashSet<String> dupli = new HashSet<String>();
			String title = (String) news.getAs(1);
			LocalDate ldate = LocalDate.parse((String) news.getAs(2)).plusYears(5);
			String dt = ldate.toString();
			if (dt.compareTo(timeStamp) <= 0) {
				System.out.println("TOKENED");
				String[] tokens =title.split(" ");
				System.out.println(tokens[0]);
				for (int j = 0; j < tokens.length; j++) {
					if (tokens[j].matches("^[a-zA-Z]*$")) {
						tokens[j] = tokens[j].toLowerCase();
						if (tokens[j].matches("^[a-zA-Z]*$") && !(tokens[j].equals("a") || tokens[j].equals("all") 
							|| tokens[j].equals("any") || tokens[j].equals("but") || tokens[j].equals("the") 
							|| tokens[j].equals("or") || tokens[j].equals("for") || tokens[j].equals("on")
							|| tokens[j].equals("at") || tokens[j].equals("in") || tokens[j].equals("of"))) {
							tokens[j] = (String) stemmer.stem(tokens[j]);
							if (!dupli.contains(tokens[j]) && tokens[j].length() > 0 && title != "" ) { // check if it is not an empty string
								try {
									Thread.sleep((long) 1.0);
								} catch (InterruptedException e) {
									// TODO Auto-generated catch block
									e.printStackTrace();
								}
								dupli.add(tokens[j]);
								try {
									Thread.sleep((long) 2.0);
								} catch (InterruptedException e) {
									// TODO Auto-generated catch block
									e.printStackTrace();
								}
								Item word = new Item()
												.withPrimaryKey("keyword", tokens[j], "headline", title)
												.withString("category", (String) news.getAs(0))
												.withString("date", dt);
								words.add(word);
							}
						}
					}

					if (words.size() == 25 || j == tokens.length - 1) {
						try {
							Thread.sleep((long) 2.0);
						} catch (InterruptedException e) {
							// TODO Auto-generated catch block
							e.printStackTrace();
						}
						try {
							TableWriteItems writ = new TableWriteItems(tableName).withItemsToPut(words);
							BatchWriteItemOutcome ret = conn.batchWriteItem(writ);
							Map<String, List<WriteRequest>> leftover = ret.getUnprocessedItems();
							if (leftover != null && leftover.size() != 0) {
								try {
										Thread.sleep((long) 2.0);
									} catch (InterruptedException e) {
										// TODO Auto-generated catch block
										e.printStackTrace();
									}
								conn.batchWriteItemUnprocessed(leftover);	
							}
							words = new HashSet<Item>();
						} catch (Exception e) {
							System.out.println("error occurred");
						} finally {
							words = new HashSet<Item>();
							continue;
						}
					}
				}
				
			} else {
				System.out.println(dt);
			}
			
		});

    }

    public void shutdown() {
		logger.info("Shutting down");
		
		DynamoConnector.shutdown();
		
		if (spark != null)
			spark.close();
	}
	
	public static void main(String[] args) {
		final TokenizeNews ln = new TokenizeNews();

		try {
            ln.initialize();
			ln.uploadTokenized();
		} catch (final IOException ie) {
			logger.error("I/O error: ");
			ie.printStackTrace();
		} catch (final DynamoDbException e) {
			e.printStackTrace();
		} catch (final InterruptedException e) {
			e.printStackTrace();
		} finally {
			ln.shutdown();
		}
	}  

}